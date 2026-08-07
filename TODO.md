# TODO — Inscription confirmée dans un nouvel onglet

## Objectif
Quand l'utilisateur clique sur « Confirmer les inscriptions », il doit ouvrir un nouvel onglet
pour voir les mois de formation et les détails, puis confirmer ou refuser.
S'il confirme → il passe à « Mes commandes » et la demande est en attente dans l'AdminDashboard.

## Étapes
- [x] 1. Analyser le code existant (Formation, FormationDetail, App, InscriptionConfirm, inscriptionFlow, commandes backend)
- [x] 2. Valider le plan avec l'utilisateur
- [x] 3. Enregistrer la route `/inscription/confirm` dans `src/App.js` + importer `InscriptionConfirm` + restauration d'auth au boot
- [x] 4. Modifier `src/pages/Formation.jsx` : le bouton « Confirmer les inscriptions » ouvre le nouvel onglet
- [x] 5. Modifier `src/pages/FormationDetail.jsx` : le bouton « Confirmer les inscriptions » ouvre le nouvel onglet
- [x] 6. Vérifier la compilation (`npm run build` → succès)
