export type Testimonial = {
  name: string;
  role: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  /**
   * Un avis inventé n'est pas un avis. Tant que ce drapeau est vrai, la
   * page affiche un bandeau « Exemple » sur la carte. À retirer en remplaçant
   * le texte par le retour réel d'un collectionneur, avec son accord.
   */
  placeholder?: boolean;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Prénom N.",
    role: "Collectionneur, Set de Base",
    text: "Ici, le retour d'un collectionneur qui a scanné sa première boîte et découvert ce qu'elle valait vraiment.",
    rating: 5,
    placeholder: true,
  },
  {
    name: "Prénom N.",
    role: "Vendeur occasionnel",
    text: "Ici, le retour de quelqu'un qui vend sur Cardmarket et qui a arrêté de convertir des prix en dollars.",
    rating: 5,
    placeholder: true,
  },
  {
    name: "Prénom N.",
    role: "Collection partagée",
    text: "Ici, le retour d'une personne qui a envoyé le lien de sa collection à ses amis ou à un acheteur.",
    rating: 4,
    placeholder: true,
  },
];
