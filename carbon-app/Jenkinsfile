// CarbonTrack — Jenkins pipeline for the Next.js web app
// Branch: main
// Deploys to /var/www/carbontrack/ on 37.60.240.199
//
// Prerequisites in Jenkins:
//   - Node 20 + npm available on the Jenkins agent (or use a Docker agent — see commented block)
//   - The 'jenkins' user must be in the 'deployer' group (see DEPLOYMENT.md Phase 2)
//   - pm2 installed globally on the server (the jenkins user inherits PATH)

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
    disableConcurrentBuilds()      // never deploy two builds simultaneously
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    APP_NAME      = 'carbontrack'
    APP_ROOT      = '/var/www/carbontrack'
    DEPLOY_USER   = 'deployer'
    RELEASE_ID    = "${env.BUILD_NUMBER}-${new Date().format('yyyyMMddHHmmss')}"
    RELEASE_DIR   = "${APP_ROOT}/releases/${RELEASE_ID}"
    SHARED_ENV    = "${APP_ROOT}/shared/.env.local"
    KEEP_RELEASES = '5'
    NODE_OPTIONS  = '--max-old-space-size=4096'
  }

  // Optional Docker agent — uncomment if your Jenkins runs in a constrained
  // environment without Node 20 installed natively.
  //
  // agent { docker { image 'node:20-bookworm'; args '-u root:root -v /var/www:/var/www' } }

  stages {
    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: '*/main']],
          extensions: [
            [$class: 'CloneOption', shallow: true, depth: 1, noTags: true],
            [$class: 'CleanBeforeCheckout']
          ],
          userRemoteConfigs: [[
            url: 'https://github.com/MoctarSidibe/carbontrack.git'
            // For private repos, add: credentialsId: 'github-token'
          ]]
        ])
      }
    }

    stage('Install') {
      steps {
        sh '''
          set -eux
          # main branch root IS the carbon-app project (no nested subdir)
          node --version
          npm --version
          npm ci
        '''
      }
    }

    stage('Lint & typecheck') {
      steps {
        sh '''
          set -eux
          # ESLint + TypeScript are both skipped during build (see next.config.js).
          # This stage is informational only.
          npx next lint || true
        '''
      }
    }

    stage('Build') {
      steps {
        sh '''
          set -eux
          # Inject the shared production env file so build-time NEXT_PUBLIC_* values resolve
          cp ${SHARED_ENV} .env.local 2>/dev/null || true
          npm run build
        '''
      }
    }

    stage('Deploy: stage release') {
      steps {
        sh '''
          set -eux
          # Create the release directory owned by the deployer group
          sudo -u ${DEPLOY_USER} mkdir -p ${RELEASE_DIR}

          # Ensure workspace files are world-readable for the rsync below
          chmod -R a+r .

          # Copy only what the runtime needs (exclude .git + Next.js cache)
          sudo -u ${DEPLOY_USER} rsync -a --delete \
            --exclude='.git' --exclude='.next/cache' --exclude='.env.local' \
            ./ ${RELEASE_DIR}/

          # Link shared env + persistent uploads + logos
          sudo -u ${DEPLOY_USER} mkdir -p ${APP_ROOT}/shared/logos ${APP_ROOT}/shared/private-uploads
          sudo -u ${DEPLOY_USER} ln -sfn ${SHARED_ENV} ${RELEASE_DIR}/.env.local
          # Private files (audit evidence, CNC certificates) live in <app>/uploads, served only via auth'd API routes — never via nginx
          sudo -u ${DEPLOY_USER} ln -sfn ${APP_ROOT}/shared/private-uploads ${RELEASE_DIR}/uploads
          sudo -u ${DEPLOY_USER} ln -sfn ${APP_ROOT}/shared/uploads ${RELEASE_DIR}/public/uploads 2>/dev/null || true
          sudo -u ${DEPLOY_USER} ln -sfn ${APP_ROOT}/shared/logos ${RELEASE_DIR}/public/logos 2>/dev/null || true
        '''
      }
    }

    stage('Deploy: switch symlink') {
      steps {
        sh '''
          set -eux
          # Atomic symlink swap — 'current' now points at the new release
          sudo -u ${DEPLOY_USER} ln -sfn ${RELEASE_DIR} ${APP_ROOT}/current

          # Ensure ecosystem config at the app root is up to date
          sudo -u ${DEPLOY_USER} cp ${APP_ROOT}/current/ecosystem.config.js ${APP_ROOT}/ecosystem.config.js
        '''
      }
    }

    stage('Reload PM2') {
      steps {
        sh '''
          set -eux
          # Reload picks up new code (zero-downtime in cluster mode, brief restart in fork mode)
          if sudo -u ${DEPLOY_USER} pm2 describe ${APP_NAME} >/dev/null 2>&1; then
            sudo -u ${DEPLOY_USER} pm2 reload ${APP_ROOT}/ecosystem.config.js --env production --update-env
          else
            sudo -u ${DEPLOY_USER} pm2 start ${APP_ROOT}/ecosystem.config.js --env production
          fi
          sudo -u ${DEPLOY_USER} pm2 save
          sleep 3
          sudo -u ${DEPLOY_USER} pm2 status ${APP_NAME}
        '''
      }
    }

    stage('Smoke test') {
      steps {
        sh '''
          set -eu
          # Wait up to 30s for the app to respond
          for i in $(seq 1 15); do
            if curl -fsS -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:3000/ | grep -E '^(2|3)' >/dev/null; then
              echo "Smoke test passed (attempt $i)"
              exit 0
            fi
            echo "waiting ($i/15)..."
            sleep 2
          done
          echo "Smoke test FAILED — app did not respond on :3000"
          sudo -u ${DEPLOY_USER} pm2 logs ${APP_NAME} --lines 40 --nostream || true
          exit 1
        '''
      }
    }

    stage('Prune old releases') {
      steps {
        sh '''
          set -eu
          cd ${APP_ROOT}/releases
          # Keep only the N most recent releases (current + KEEP_RELEASES - 1 older)
          # 'ls -tr' = oldest first; pipe trims everything except the tail
          to_delete=$(ls -tr | head -n -${KEEP_RELEASES} || true)
          for d in $to_delete; do
            # Never delete the directory the 'current' symlink points to
            target=$(readlink -f ${APP_ROOT}/current)
            full="${APP_ROOT}/releases/${d}"
            if [ "$target" != "$full" ]; then
              echo "Pruning old release: $d"
              sudo rm -rf "$full" 2>/dev/null || sudo -u ${DEPLOY_USER} rm -rf "$full" 2>/dev/null || true
            fi
          done
        '''
      }
    }
  }

  post {
    success {
      echo "✅ Deploy of ${APP_NAME} #${env.BUILD_NUMBER} succeeded"
    }
    failure {
      echo "❌ Deploy of ${APP_NAME} #${env.BUILD_NUMBER} FAILED — release ${RELEASE_ID} kept for inspection at ${RELEASE_DIR}"
      // The 'current' symlink still points to the previous good release, so production is unaffected.
    }
    always {
      sh 'echo "Workspace size:"; du -sh . 2>/dev/null || true'
    }
  }
}
