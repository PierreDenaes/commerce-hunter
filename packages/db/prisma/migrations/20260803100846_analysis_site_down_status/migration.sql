-- Site durablement injoignable (domaine mort, connexion refusée) :
-- statut distinct de FAILED (erreur transitoire) pour le traiter comme
-- un signal de prospection et non comme une erreur technique.
ALTER TYPE "AnalysisStatus" ADD VALUE IF NOT EXISTS 'SITE_DOWN';
