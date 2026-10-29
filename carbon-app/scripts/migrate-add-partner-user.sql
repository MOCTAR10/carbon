-- Ajout de la colonne partner_id à la table users pour permettre aux ONG de se connecter
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id);

-- S'assurer que le rôle 'partner' peut être utilisé (déjà géré par varchar en général)
-- Modification de la contrainte si elle existe
