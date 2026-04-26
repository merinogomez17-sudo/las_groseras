import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: '2pt solid #BE123C',
    paddingBottom: 15,
  },
  logo: {
    width: 70,
  },
  titleContainer: {
    textAlign: 'right',
  },
  title: {
    fontSize: 18,
    fontWeight: 'black',
    color: '#BE123C',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eventInfo: {
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    border: '1pt solid #e2e8f0',
  },
  eventName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  eventDetail: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#BE123C',
    textTransform: 'uppercase',
    marginTop: 15,
    marginBottom: 8,
    backgroundColor: '#fff1f2',
    padding: 5,
    borderRadius: 4,
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 6,
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #f1f5f9',
    padding: 8,
    alignItems: 'center',
  },
  headerCol: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  colInsumo: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colStock: { flex: 1, textAlign: 'center' },
  colBuy: { flex: 1, textAlign: 'center' },
  
  cellText: {
    fontSize: 9,
    color: '#334155',
  },
  cellQty: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  cellBuy: {
    color: '#BE123C',
    fontWeight: 'black',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTop: '1pt solid #f1f5f9',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    fontStyle: 'italic',
  }
});

const EventShoppingListPDF = ({ event, items, recipes = [] }) => {
  const specificItems = items.filter(i => !i.is_generic);
  const genericItems  = items.filter(i => i.is_generic);
  
  const dateStr = new Date().toLocaleDateString('es-MX', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric'
  });

  return (
    <Document title={`Lista de Compras - ${event.nombre_evento}`}>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Image src="/logo.png" style={styles.logo} />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Lista de Compras</Text>
            <Text style={styles.subtitle}>Logística Las Groseras</Text>
          </View>
        </View>

        {/* EVENT DATA */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventName}>{event.nombre_evento}</Text>
          <Text style={styles.eventDetail}>Fecha: {dateStr}</Text>
          <Text style={styles.eventDetail}>Pax: {event.numero_personas}</Text>
          <Text style={styles.eventDetail}>Cliente: {event.clientes?.nombre_completo}</Text>
        </View>

        {/* RECIPE BREAKDOWN */}
        {recipes.length > 0 && (
          <View style={{ marginBottom: 15 }}>
            <Text style={styles.sectionTitle}>Distribución de Bebidas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {recipes.map((r, i) => (
                <View key={i} style={{ backgroundColor: '#f1f5f9', padding: '4 8', borderRadius: 4 }}>
                  <Text style={{ fontSize: 8, fontWeight: 'bold' }}>
                    {r.nombre}: <Text style={{ color: '#BE123C' }}>{r.cantidad}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SPECIFIC ITEMS SECTION */}
        {specificItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Insumos con Stock Registrado</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={styles.colInsumo}><Text style={styles.headerCol}>Insumo</Text></View>
                <View style={styles.colQty}><Text style={styles.headerCol}>Necesitas</Text></View>
                <View style={styles.colStock}><Text style={styles.headerCol}>Stock</Text></View>
                <View style={styles.colBuy}><Text style={styles.headerCol}>A Comprar</Text></View>
              </View>

              {specificItems.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <View style={styles.colInsumo}>
                    <Text style={styles.cellText}>{item.nombre}</Text>
                  </View>
                  <View style={styles.colQty}>
                    <Text style={styles.cellQty}>{item.necesitas.toFixed(1)}</Text>
                  </View>
                  <View style={styles.colStock}>
                    <Text style={styles.cellText}>{item.en_inventario.toFixed(1)}</Text>
                  </View>
                  <View style={styles.colBuy}>
                    <Text style={[styles.cellQty, item.a_comprar > 0 ? styles.cellBuy : {}]}>
                      {item.a_comprar.toFixed(1)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* GENERIC ITEMS SECTION */}
        {genericItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Insumos sin Stock Registrado (Genéricos)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <View style={styles.colInsumo}><Text style={styles.headerCol}>Insumo / Tipo</Text></View>
                <View style={styles.colQty}><Text style={styles.headerCol}>Necesitas</Text></View>
                <View style={styles.colStock}><Text style={styles.headerCol}>Unidad</Text></View>
              </View>

              {genericItems.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <View style={styles.colInsumo}>
                    <Text style={styles.cellText}>{item.nombre}</Text>
                  </View>
                  <View style={styles.colQty}>
                    <Text style={styles.cellQty}>{item.necesitas.toFixed(1)}</Text>
                  </View>
                  <View style={styles.colStock}>
                    <Text style={styles.cellText}>{item.unidad}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este documento es una guía de preparación logística. Verifique siempre el stock físico antes de comprar.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default EventShoppingListPDF;
