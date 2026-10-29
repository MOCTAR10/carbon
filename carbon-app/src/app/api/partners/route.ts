import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const partners = await query(`
      SELECT 
        p.*,
        COALESCE(cp.total_projects, 0) as total_projects,
        COALESCE(cp.total_tons_available, 0) as total_tons_available,
        COALESCE(cp.total_tons_sold, 0) as total_tons_sold
      FROM partners p
      LEFT JOIN (
        SELECT 
          partner_id, 
          COUNT(*) as total_projects,
          SUM(tons_available) as total_tons_available,
          SUM(tons_sold) as total_tons_sold
        FROM carbon_projects
        GROUP BY partner_id
      ) cp ON p.id = cp.partner_id
      ORDER BY p.created_at DESC
    `)
    
    const total_wallet = await query(`SELECT COALESCE(SUM(wallet_balance),0) as total FROM partners`)
    const total_sold_tons = await query(`SELECT COALESCE(SUM(tons_sold),0) as total FROM carbon_projects WHERE is_local = true`)
    const total_revenue_generated = await query(`SELECT COALESCE(SUM(amount_paid),0) as total FROM carbon_transactions WHERE partner_credited > 0`)

    return NextResponse.json({
      partners: partners.rows,
      stats: {
        total_partners: partners.rows.length,
        total_wallet_balance: parseFloat(total_wallet.rows[0].total),
        total_tons_sold: parseFloat(total_sold_tons.rows[0].total),
        total_revenue_generated: parseFloat(total_revenue_generated.rows[0].total)
      }
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur BDD' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { name, type, country } = await req.json()
    const cardNumber = Array.from({length: 4}, () => Math.floor(1000 + Math.random() * 9000)).join(' ')
    const qrHash = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)

    const insertPartner = await query(
      `INSERT INTO partners (name, type, country, virtual_card_number, qr_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, type, country, cardNumber, qrHash]
    )
    const newPartner = insertPartner.rows[0]

    let defaultImage = 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80'
    if (type === 'Conservation') defaultImage = 'https://images.unsplash.com/photo-1516026672322-bc52d61a47b8?w=800&q=80'
    if (type === 'Énergie Solaire') defaultImage = 'https://images.unsplash.com/photo-1509391366360-2e9597a8402c?w=800&q=80'
    if (type === 'Protection Côtière') defaultImage = 'https://images.unsplash.com/photo-1558904541-efa8d9a2ffb3?w=800&q=80'

    await query(
      `INSERT INTO carbon_projects (partner_id, title, description, project_type, country, price_per_ton, tons_available, image_url, is_local)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [newPartner.id, `Initiative - ${name}`, `Financement direct de l'ONG ${name} pour ses actions de ${type.toLowerCase()} au/en ${country}.`, type, country, 15000, 10000, defaultImage, true]
    )

    return NextResponse.json(newPartner)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur Creation Partner' }, { status: 500 })
  }
}
