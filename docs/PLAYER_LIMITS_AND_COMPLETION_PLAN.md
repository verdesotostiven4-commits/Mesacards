# MesaCards: limites de jugadores y plan para completar la app

## Estado actual

MesaCards ya tiene una base PWA movil con juegos locales, tutoriales, efectos visuales, sonidos, vibracion y flujo inicial para orientar al usuario.

El modo que debe considerarse funcional ahora es:

- Mismo celular / pass-and-play.
- Sin cuentas.
- Sin dinero real.
- Puntos virtuales.
- Ideal para probar reglas, experiencia, tutoriales y diseno.

## Decision profesional de jugadores por juego

| Juego | Minimo | Recomendado | Maximo final | Comentario |
|---|---:|---:|---:|---|
| 21 Flash | 1 jugador + banca virtual | 2 a 5 | 6 | Va bien con varios porque todos juegan contra la banca. En celular compartido, mas de 6 se vuelve lento. |
| Hold'em Social | 2 | 2 a 6 | 8 | Puede soportar hasta 8, pero en pantalla de celular 6 se siente mejor. Para 8 conviene vista horizontal o salas online. |
| Rummy Parejas | 2 | 2 | 4 | Rummy funciona mejor de 2 a 4. Mas de 4 hace rondas largas y menos claras. |
| Gem Clash | 2 | 2 a 4 | 5 | Es el modo mas facil para gente nueva. Se puede llevar a 5, pero 4 es mas limpio y balanceado. |

## Modo mismo celular

Sirve para jugar sin internet y para probar rapido con pareja o amigos. Es el modo mas simple y estable.

Limitaciones:

- Si hay cartas privadas, hay que pasarse el celular sin mirar las cartas del otro.
- Con muchos jugadores se vuelve lento.
- No conviene para partidas largas de 6 a 8 jugadores.

Uso recomendado:

- 2 jugadores: perfecto.
- 3 a 4 jugadores: bien.
- 5 o mas: solo para 21 Flash o Gem Clash.

## Modo online con codigo

Este es el modo necesario para que cada jugador use su propio celular.

Necesita backend realtime. Recomendacion:

- Supabase Realtime para salas, presencia y sincronizacion.
- Base de datos para rooms, players y game_state.
- Codigo de sala corto para compartir por WhatsApp.
- Reconexion si alguien cierra la app.
- Estado oculto por jugador para cartas privadas.

Flujo:

1. Crear sala.
2. Elegir juego.
3. Compartir codigo.
4. Otros jugadores entran con codigo.
5. Cada celular muestra solo su informacion privada.
6. El servidor o anfitrion sincroniza mesa, turnos, rondas y resultados.

## Bluetooth / cercanos

No debe ser el modo principal.

Razon:

- En PWA no funciona igual en todos los dispositivos.
- iPhone suele limitar mucho estas conexiones.
- Android/Chrome puede permitir mas opciones, pero no es una experiencia universal.

Decision:

- Dejarlo como modo experimental.
- Priorizar online con codigo.
- Mantener mismo celular como opcion sin internet.

## Personalizacion de jugadores

Debe incluir:

- Nombre.
- Avatar/personaje.
- Color de perfil.
- Marco o insignia.
- Efecto de victoria.
- Preferencias guardadas en el dispositivo.

Primera version recomendada:

- 12 avatares emoji o ilustrados.
- 6 colores.
- 4 marcos simples.

Version avanzada:

- Personajes desbloqueables solo por uso, sin compras.
- Mesa personalizada por sala.
- Reacciones rapidas: risa, sorpresa, pensar, buena jugada.

## Que falta para decir que esta completa

### Fase 1: cerrar PWA local

- Revisar bugs de cada juego.
- Ajustar limites por juego.
- Mejorar pantalla de seleccion de jugadores.
- Agregar avatares por jugador.
- Mejorar tutoriales con ejemplos visuales.
- Guardar preferencias.

### Fase 2: multijugador online real

- Crear proyecto Supabase.
- Crear tablas rooms, players, game_state y events.
- Crear codigo de sala.
- Sincronizar turnos.
- Sincronizar cartas publicas y privadas.
- Manejar reconexion.
- Manejar salida de jugadores.
- Probar con 2, 3, 4 y 6 jugadores.

### Fase 3: pulido profesional

- Animaciones por juego.
- Sonidos mas especificos por accion.
- Vibracion personalizada por evento.
- Pantalla de resultados.
- Historial de partidas local.
- Tutorial interactivo por primera partida.
- Version horizontal para partidas largas.

### Fase 4: app publicable

- Iconos reales en varios tamanos.
- Capturas para promocion.
- Politica de privacidad simple.
- Texto claro: juegos sociales con puntos virtuales.
- Sin dinero real, sin premios, sin intercambio de valor.

## Decision final recomendada

Para que MesaCards se sienta completa y profesional, el orden correcto es:

1. Dejar perfecto el modo mismo celular.
2. Agregar personalizacion de jugadores.
3. Conectar online con codigo usando Supabase.
4. Probar cada juego con limites reales.
5. Pulir diseno, animaciones, sonidos y experiencia.

No conviene prometer Bluetooth como solucion principal. Conviene vender la experiencia como: jugar juntos en un celular o crear una sala privada online.
