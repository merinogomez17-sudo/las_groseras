import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottom: '2pt solid #BE123C',
    paddingBottom: 20,
  },
  logo: {
    width: 80,
  },
  titleContainer: {
    textAlign: 'right',
  },
  title: {
    fontSize: 20,
    fontWeight: 'black',
    color: '#BE123C',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eventInfo: {
    marginBottom: 30,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
  },
  eventName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 9,
    color: '#64748b',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #f1f5f9',
    padding: 10,
    alignItems: 'center',
  },
  headerCol: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  colInsumo: { flex: 3 },
  colFaltante: { flex: 1, textAlign: 'center' },
  colUnidad: { flex: 1, textAlign: 'center' },
  colProveedor: { flex: 2, textAlign: 'right' },
  
  cellText: {
    fontSize: 10,
    color: '#334155',
  },
  cellQty: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#BE123C',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    borderTop: '1pt solid #f1f5f9',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    fontStyle: 'italic',
  }
});

const ShoppingListPDF = ({ event, items }) => {
  const dateStr = new Date().toLocaleDateString('es-MX', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Document title={`Lista de Compras - ${event.nombre_evento}`}>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Image src="/logo.png" style={styles.logo} />
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Lista de Compras</Text>
            <Text style={styles.subtitle}>Insumos Faltantes para Evento</Text>
          </View>
        </View>

        {/* EVENT DATA */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventName}>Evento: {event.nombre_evento}</Text>
          <Text style={styles.eventDate}>Generado el: {dateStr}</Text>
          <Text style={styles.eventDate}>Cliente: {event.clientes?.nombre_completo}</Text>
        </View>

        {/* TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colInsumo}><Text style={styles.headerCol}>Insumo / Presentación</Text></View>
            <View style={styles.colFaltante}><Text style={styles.headerCol}>Faltante</Text></View>
            <View style={styles.colUnidad}><Text style={styles.headerCol}>Unidad</Text></View>
            <View style={styles.colProveedor}><Text style={styles.headerCol}>Proveedor Sugerido</Text></View>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.colInsumo}>
                <Text style={styles.cellText}>{item.nombre}</Text>
              </View>
              <View style={styles.colFaltante}>
                <Text style={[styles.cellText, styles.cellQty]}>{item.faltante.toFixed(2)}</Text>
              </View>
              <View style={styles.colUnidad}>
                <Text style={styles.cellText}>{item.unidad}</Text>
              </View>
              <View style={styles.colProveedor}>
                <Text style={styles.cellText}>{item.proveedor || 'N/A'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este documento fue generado automáticamente al detectar déficit de stock en Las Groseras CRM.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ShoppingListPDF;
