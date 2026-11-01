// Datos de ejemplo del radar de precios. Los productos usan los mismos nombres que el catálogo del
// frontend (src/catalog.js); las tiendas, zonas y montos son de prueba: reemplazar por reales si se desea.
module.exports = {
  'Arroz Tío Pelón 1 kg': [
    { id: 'arroz-1', tienda: 'Super Ahorro', zona: 'Centro', precio: 1450, reportes: 12 },
    { id: 'arroz-2', tienda: 'Mini Mercado La Esquina', zona: 'Campus', precio: 1600, reportes: 5 },
    { id: 'arroz-3', tienda: 'Mega Plaza', zona: 'Norte', precio: 1380, reportes: 20 },
    { id: 'arroz-4', tienda: 'Abastecedor Don Pepe', zona: 'Sur', precio: 1700, reportes: 2 },
  ],
  'Leche Dos Pinos 1 L': [
    { id: 'leche-1', tienda: 'Super Ahorro', zona: 'Centro', precio: 1100, reportes: 9 },
    { id: 'leche-2', tienda: 'Mega Plaza', zona: 'Norte', precio: 1050, reportes: 14 },
    { id: 'leche-3', tienda: 'Mini Mercado La Esquina', zona: 'Campus', precio: 1250, reportes: 4 },
  ],
  'Huevos docena': [
    { id: 'huevos-1', tienda: 'Mega Plaza', zona: 'Norte', precio: 2900, reportes: 11 },
    { id: 'huevos-2', tienda: 'Super Ahorro', zona: 'Centro', precio: 3100, reportes: 7 },
    { id: 'huevos-3', tienda: 'Abastecedor Don Pepe', zona: 'Sur', precio: 3300, reportes: 3 },
  ],
  'Pan cuadrado': [
    { id: 'pan-1', tienda: 'Panadería Central', zona: 'Centro', precio: 900, reportes: 6 },
    { id: 'pan-2', tienda: 'Super Ahorro', zona: 'Centro', precio: 1000, reportes: 8 },
  ],
};
