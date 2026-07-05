# MesaCards: flujo online, perfiles y social

## Objetivo

Crear una experiencia donde cada jugador tenga su cuenta/perfil, pueda buscar a otros por ID o nombre, enviar solicitudes, compartir enlaces y jugar en salas privadas desde celulares separados.

## Identidad del jugador

Cada cuenta debe tener:

- ID interno: UUID de Supabase Auth.
- ID publico automatico: ejemplo `MC-A7K92P`.
- Nombre visible unico: ejemplo `Stiven`.
- Avatar/personaje.
- Color y marco.
- Nivel, XP, puntos totales, victorias, derrotas, empates, racha actual y mejor racha.

## Reglas de nombres

- No se pueden repetir nombres visibles.
- El nombre debe tener entre 3 y 18 caracteres.
- El ID publico se genera automatico y nunca se repite.
- Si el usuario no personaliza nombre, queda temporalmente como `Jugadorxxxxxx`.

## Buscar jugador

La busqueda debe aceptar:

- ID publico: `MC-A7K92P`.
- Nombre visible: `Stiven`.

Resultado recomendado:

- Avatar.
- Nombre.
- ID publico.
- Nivel.
- Boton: enviar solicitud.
- Si ya son amigos: boton invitar a sala.
- Si ya hay solicitud pendiente: mostrar pendiente.

## Solicitudes de amistad

Estados:

- pending: solicitud enviada.
- accepted: amigos.
- blocked: bloqueado.

Flujo:

1. Busco jugador por ID o nombre.
2. Toco enviar solicitud.
3. Al otro usuario le aparece una notificacion en la app.
4. Puede aceptar o rechazar.
5. Si acepta, se agrega a la lista de amigos.

## Compartir perfil

Cada perfil puede tener un enlace:

`https://verdesotostiven4-commits.github.io/Mesacards/?profile=MC-A7K92P`

Cuando alguien abre ese enlace:

1. Si no tiene cuenta, se le pide crear perfil.
2. Luego se abre el perfil compartido.
3. Aparece boton para enviar solicitud.
4. Si ya son amigos, aparece boton para invitar a sala.

## Compartir sala

Cada sala puede tener un enlace:

`https://verdesotostiven4-commits.github.io/Mesacards/?room=K7P4Q`

Cuando alguien abre ese enlace:

1. Si no tiene cuenta, se le pide crear perfil.
2. Luego se intenta unir a la sala.
3. Si la sala esta llena, muestra error claro.
4. Si la partida ya empezo, puede entrar como espectador o esperar, segun el modo.
5. Si entra correctamente, queda en lobby esperando que el host inicie.

## Lobby online

El lobby debe mostrar:

- Codigo de sala.
- Juego elegido.
- Jugadores conectados.
- Avatares.
- Estado listo/no listo.
- Boton copiar enlace.
- Boton compartir por WhatsApp.
- Boton iniciar partida solo para host.

## Historial del jugador

Cada perfil debe mostrar:

- Juegos jugados.
- Victorias.
- Derrotas.
- Empates.
- Puntos totales.
- Nivel.
- XP.
- Racha actual.
- Mejor racha.
- Ultimas partidas.

## Rachas

Reglas recomendadas:

- Si gana: racha +1.
- Si pierde: racha vuelve a 0.
- Si empata: racha se mantiene.
- Si abandona: cuenta como derrota.

## Puntos y XP

Sistema simple recomendado:

- Participar en partida: +10 XP.
- Ganar: +30 XP.
- Empate: +15 XP.
- Completar partida sin abandonar: +5 XP extra.

Puntos del juego:

- Se guardan como puntos virtuales/historial.
- No tienen valor real.
- No se compran ni se venden.

## Privacidad y seguridad

- No mostrar email publico.
- No mostrar datos personales.
- Solo mostrar nombre, ID, avatar y estadisticas de juego.
- Permitir bloquear jugador.
- Permitir cambiar nombre si esta disponible.

## Implementacion tecnica recomendada

Frontend:

- Auth anonima o email magic link con Supabase.
- Cliente Supabase JS.
- Pantalla de perfil.
- Busqueda por ID/nombre.
- Lista de amigos.
- Lobby online.
- Compartir links con `profile=` y `room=`.

Backend/Supabase:

- Tabla `profiles`.
- Tabla `friendships`.
- Tabla `rooms`.
- Tabla `room_players`.
- Tabla `game_results`.
- Tabla `share_invites`.
- Realtime en `rooms` y `room_players`.

## Prioridad de construccion

1. Perfil local visual.
2. Conectar Supabase Auth.
3. Crear perfil online con ID automatico.
4. Buscar perfil por ID/nombre.
5. Solicitudes de amistad.
6. Crear sala online con codigo.
7. Unirse por link.
8. Lobby realtime.
9. Sincronizar primer juego online.
10. Guardar resultados e historial.
