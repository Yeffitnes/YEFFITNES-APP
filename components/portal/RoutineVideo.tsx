import { Icon } from "@/components/ui/Icon";
import { PLAY_PATH } from "./VideoModal";
// Vídeo de la rutina: grande, con la marca. Si aún no existe se muestra con candado (mismo diseño, sin botón de reproducir).
// poster (29-oct): portada del propio vídeo, difuminada y teñida de negro con rojo, para que "se alcance a ver un poquito" (pedido de Cristian).
// onWarm: se llama al empezar a tocar (antes del clic) para ir pidiendo el enlace del vídeo y que abra más rápido.
export function RoutineVideo({ locked, personal, label, onOpen, poster, onWarm }: { locked?: boolean; personal?: boolean; label: string; onOpen?: () => void; poster?: string | null; onWarm?: () => void }) {
  const inner = (
    <>
      {poster && !locked && <span className="vposter" aria-hidden style={{ backgroundImage: `url("${poster}")` }} />}
      <span className="rv-tag">{locked ? <><Icon name="lock" size={11} stroke={2} /> Disponible pronto</> : personal ? <><Icon name="check" size={11} stroke={2.4} /> Grabado para ti</> : "Vídeo de la rutina"}</span>
      <span className="rv-center">{locked ? <Icon name="lock" size={20} stroke={1.7} /> : <svg viewBox="0 0 20 20"><path d={PLAY_PATH} /></svg>}</span>
      <span className="rv-label">{label}<small>{locked ? "Tu coach lo sube antes de tu sesión" : "Toca para ver"}</small></span>
    </>
  );
  return locked ? <div className="rv locked" role="img" aria-label="Vídeo de la rutina, aún no disponible">{inner}</div>
    : <button type="button" className={`rv${poster ? " has-poster" : ""}`} aria-label="Ver vídeo de la rutina" onClick={onOpen} onPointerDown={onWarm} onMouseEnter={onWarm} onFocus={onWarm}>{inner}</button>;
}
