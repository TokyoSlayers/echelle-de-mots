import { BookOpen } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog'

export function RulesDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="size-4" />
          Règles
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Comment grimper</DialogTitle>
        <DialogDescription>
          Comme les Doublets de Lewis Carroll : un mot de départ, un mot au sommet, et rien d’autre
          qu’une lettre à changer à chaque échelon.
        </DialogDescription>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#2a1845]/85">
          <li>
            <strong className="text-[#2a1845]">Une lettre.</strong> Le mot suivant a la même longueur
            et ne diffère que d’une seule lettre. « chat » peut devenir « char », pas « chien ».
          </li>
          <li>
            <strong className="text-[#2a1845]">Les accents ne comptent pas.</strong> tête, téte et
            tete sont le même mot. Le dictionnaire garde la graphie sans accent.
          </li>
          <li>
            <strong className="text-[#2a1845]">Un vrai mot.</strong> Chaque échelon doit appartenir
            au dictionnaire des mots français courants de 3, 4 ou 5 lettres.
          </li>
          <li>
            <strong className="text-[#2a1845]">Trois difficultés.</strong> Facile : 3 ou 4 pas.
            Moyen : 5 ou 6. Difficile : 8 à 10. Le nombre annoncé est le minimum possible.
          </li>
          <li>
            <strong className="text-[#2a1845]">Indice.</strong> Révèle le prochain mot d’un chemin
            optimal depuis ta position. Chaque indice coûte des points, une seule fois par échelon.
          </li>
          <li>
            <strong className="text-[#2a1845]">Score.</strong> Base de 500, 900 ou 1&nbsp;400,
            bonus de rapidité, +180 si tu fais exactement le minimum, −35 par pas en trop, moins le coût des
            indices. Le total ne descend pas sous zéro.
          </li>
          <li>
            <strong className="text-[#2a1845]">Série.</strong> Une victoire l’allonge. Abandonner,
            ou lancer un nouveau défi après avoir déjà joué, la remet à zéro.
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
