/**
 * Modo personal — mensajes dedicados y detalles románticos.
 * Cambia PERSONAL_MODE a false para desactivarlos todos al masificar la app.
 */
export const PERSONAL_MODE = true

export const personal = {
  /** Nombre con el que se llama a la usuaria */
  nickname: 'amor',

  /** Subtítulo del banner según la hora */
  greetingSub: (patients) => {
    if (patients > 0)
      return `Tienes ${patients} paciente${patients !== 1 ? 's' : ''} esperándote hoy 💪`
    return '¡Bienvenida, princesa! Hoy va a ser un gran día 💖'
  },

  /** Frase motivacional aleatoria que aparece bajo el saludo */
  motivationalMessages: [
    '✨ Vas a brillar hoy, como siempre lo haces',
    '💪 Cada visita que haces cambia una vida. ¡Eres increíble!',
    '🌟 Hoy también vas a dar lo mejor de ti, que es muchísimo',
    '🫶 El cuidado que das a tus pacientes es un superpoder',
    '🌸 Te amo y sé que hoy te va a ir genial',
    '💖 Princesa al volante, ruta optimizada y corazón de oro',
    '🚀 Lista para conquistar el día, como la campeona que eres',
  ],

  /** Texto del botón principal */
  planBtnLabel: '⚡ ¡A planificar, amor!',

  /** Mensaje de éxito al calcular la ruta */
  routeSuccessMsg: '🎉 ¡Ruta lista, princesa! Vas a llegar a tiempo a todos 💖',

  /** Texto motivacional en la vista de planificación */
  plannerHint: '💖 Selecciona a tus pacientes de hoy y deja que la app haga la magia por ti',

  /** Placeholder para el estado vacío de pacientes */
  emptyPatientsMsg: 'Aún no tienes pacientes. ¡Agrega el primero, amor! 👩‍⚕️',
}

/** Devuelve un mensaje motivacional aleatorio */
export function getMotivationalMessage() {
  const msgs = personal.motivationalMessages
  return msgs[Math.floor(Math.random() * msgs.length)]
}
