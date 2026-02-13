require('dotenv').config(); 
const express = require('express');
const sql = require('mssql');

const app = express();

// Configuración de SQL Server
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

app.get('/api/pedidos', async (req, res) => {
    // Obtenemos el número de página desde la query string (?pagina=1, ?pagina=2, etc.)
    const pagina = parseInt(req.query.pagina) || 1;
    // Definimos cuántos pedidos queremos mostrar por página
    const filasPorPagina = 50;
    // Calculamos cuántas filas debemos saltar según la página actual
    const offset = (pagina - 1) * filasPorPagina;

    try {
        const pool = await sql.connect(config);

        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('filasPorPagina', sql.Int, filasPorPagina)
            .query(`
                SELECT
                    c.NumeroPedido,
                    c.RazonSocial AS Cliente,
                    FORMAT(c.FechaPedido, 'dd/MM/yyyy') AS FechaPedido,
                    (
                        SELECT TOP 1
                            l.UnidadesPedidas AS unidades,
                            l.FactorConversion_ AS factorConversion,
                            l.DescripcionArticulo AS descripcion,
                            l.UnidadMedida1_ AS unidadMedida
                        FROM LineasPedidoCliente l
                        WHERE l.NumeroPedido = c.NumeroPedido
                        ORDER BY l.Orden ASC
                        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                    ) AS lineaArticulo,
                    (
                        SELECT TOP 1
                            l.DescripcionArticulo AS descripcion
                        FROM LineasPedidoCliente l
                        WHERE l.NumeroPedido = c.NumeroPedido
                        ORDER BY l.Orden DESC
                        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                    ) AS lineaNombrePedido
                FROM CabeceraPedidoCliente c
                ORDER BY c.FechaPedido DESC
                OFFSET @offset ROWS
                FETCH NEXT @filasPorPagina ROWS ONLY
            `);

        const pedidos = result.recordset.map(p => ({
            NumeroPedido: p.NumeroPedido,
            Cliente: p.Cliente,
            FechaPedido: p.FechaPedido,
            // Subconsulta JSON: primera línea del pedido (artículo principal)
            lineaArticulo: p.lineaArticulo ? JSON.parse(p.lineaArticulo) : null,
            // Subconsulta JSON: última línea del pedido (nombre del pedido)
            lineaNombrePedido: p.lineaNombrePedido ? JSON.parse(p.lineaNombrePedido) : null
        }));

        // Si no hay pedidos en esta página, enviamos respuesta vacía
        if (pedidos.length === 0) {
            return res.status(200).send(''); 
        }

        res.json({
            pagina,
            filasPorPagina,
            pedidos
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en la consulta', detalle: err.message });
    }
});

app.listen(3000, () => {
    console.log('Servidor escuchando en http://localhost:3000');
});