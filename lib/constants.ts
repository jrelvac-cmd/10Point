// Nom fixe : une variable d'environnement oubliee sur Vercel affichait encore l'ancien nom en ligne.
export const APP_NAME = "MintCard";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
