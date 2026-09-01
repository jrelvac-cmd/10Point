/**
 * Supabase renvoie ses erreurs en anglais et volontairement vagues sur
 * l'existence d'un compte (pour éviter qu'on puisse énumérer les emails
 * inscrits). On traduit en français en restant utile sans trahir cette
 * protection : « identifiants incorrects » couvre les deux cas, et l'écran
 * propose de basculer vers l'inscription.
 */
export type AuthErrorKind = "not_confirmed" | "already_exists" | "generic";

export type FriendlyAuthError = {
  kind: AuthErrorKind;
  message: string;
};

export function translateAuthError(
  code: string | undefined,
  fallback: string,
): FriendlyAuthError {
  switch (code) {
    case "email_not_confirmed":
      return {
        kind: "not_confirmed",
        message:
          "Ton compte existe mais l'adresse n'est pas encore confirmée. Clique sur le lien reçu par mail, ou renvoie-le ci-dessous.",
      };

    case "invalid_credentials":
      return {
        kind: "generic",
        message:
          "Email ou mot de passe incorrect. Si tu n'as pas encore de compte, crée-le avec « Inscris-toi ».",
      };

    case "user_already_exists":
    case "email_exists":
      return {
        kind: "already_exists",
        message: "Un compte existe déjà avec cet email. Connecte-toi plutôt.",
      };

    case "weak_password":
      return {
        kind: "generic",
        message: "Mot de passe trop faible : utilise au moins 6 caractères.",
      };

    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return {
        kind: "generic",
        message:
          "Trop de tentatives d'affilée. Patiente une minute avant de réessayer.",
      };

    case "validation_failed":
      return { kind: "generic", message: "Adresse email invalide." };

    // Renvoyé quand le service d'email refuse la destination. Tant qu'un SMTP
    // personnalisé n'est pas branché, Supabase n'écrit qu'aux adresses membres
    // du projet : le compte est bien créé, mais aucun mail ne part.
    case "email_address_invalid":
      return {
        kind: "generic",
        message:
          "Cette adresse est refusée par le service d'envoi. Utilise une autre adresse ou connecte-toi avec Google.",
      };

    // Le SMTP a refusé l'envoi (destinataire non autorisé, identifiants SMTP
    // erronés). Le compte est créé mais aucun lien n'est parti.
    case "unexpected_failure":
      return {
        kind: "generic",
        message:
          "Le compte est créé, mais l'email de confirmation n'a pas pu être envoyé. Réessaie dans un instant ou connecte-toi avec Google.",
      };

    default:
      return { kind: "generic", message: fallback };
  }
}
