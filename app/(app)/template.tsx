/**
 * Contrairement au layout, un template est remonté à chaque navigation : c'est
 * ce qui permet de rejouer l'animation d'arrivée à chaque changement de page.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter flex flex-1 flex-col">{children}</div>;
}
