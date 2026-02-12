const fetch = require('node-fetch'); 

async function obtenerPedidos() {
    // Empezamos por la primera página
    let pagina = 1; 
    const urlBase = 'http://localhost:3000/api/pedidos'; 

    while (true) {
        try {
            // Realizamos la petición a la API con la página actual
            const response = await fetch(`${urlBase}?pagina=${pagina}`);

            // Si la respuesta está vacía (sin contenido), terminamos el bucle
            if (response.status === 200 && (response.headers.get('content-length') === '0')) {
                console.log(`Página ${pagina} vacía, terminando.`);
                break;
            }

            // Parseamos la respuesta JSON
            const data = await response.json();

            // Si el JSON está vacío o no contiene pedidos, también detenemos el bucle
            if (!data || !data.pedidos || data.pedidos.length === 0) {
                console.log(`Página ${pagina} vacía, terminando.`);
                break;
            }

            // Aquí procesamos los pedidos de la página actual
            console.log(`Procesando página ${pagina}, pedidos: ${data.pedidos.length}`);

            pagina++;

        } catch (err) {
            console.error(`Error al procesar la página ${pagina}:`, err.message);
            break; 
        }
    }

    console.log('Todos los pedidos procesados.');
}


obtenerPedidos();