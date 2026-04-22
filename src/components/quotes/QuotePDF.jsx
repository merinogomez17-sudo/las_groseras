import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Registrar fuentes si fuera necesario, para este ejercicio usaremos las estándar
// pero definiremos un estilo premium.

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
    marginBottom: 40,
    borderBottom: '2pt solid #BE123C',
    paddingBottom: 20,
  },
  logo: {
    width: 120,
  },
  headerRight: {
    textAlign: 'right',
  },
  title: {
    fontSize: 24,
    fontWeight: 'black',
    color: '#BE123C',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  quoteNumber: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'black',
    color: '#BE123C',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderBottom: '1pt solid #f1f5f9',
    paddingBottom: 5,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: 100,
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 10,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottom: '1pt solid #e2e8f0',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #f1f5f9',
    padding: 10,
    alignItems: 'center',
  },
  colDesc: { flex: 3, fontSize: 10, color: '#334155' },
  colQty: { flex: 1, fontSize: 10, textAlign: 'center', color: '#334155' },
  colPrice: { flex: 1, fontSize: 10, textAlign: 'right', color: '#334155' },
  colTotal: { flex: 1, fontSize: 10, textAlign: 'right', fontWeight: 'bold' },
  
  packageTitle: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
  packageItems: { fontSize: 8, color: '#94a3b8', marginTop: 2 },
  
  totalsSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsContainer: {
    width: 200,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  finalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 5,
    borderTop: '2pt solid #BE123C',
  },
  totalLabel: { fontSize: 10, color: '#64748b' },
  totalValue: { fontSize: 10, color: '#1e293b', fontWeight: 'bold' },
  finalTotalLabel: { fontSize: 12, fontWeight: 'black', color: '#BE123C' },
  finalTotalValue: { fontSize: 18, fontWeight: 'black', color: '#BE123C' },
  
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1pt solid #f1f5f9',
    paddingTop: 10,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8',
    marginBottom: 5,
  },
  footerBrand: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#BE123C',
    fontStyle: 'italic',
  }
});

const QuotePDF = ({ quote }) => {
  const dateStr = quote.created_at ? new Date(quote.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString();
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 15);
  const validUntilStr = validUntil.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <Document title={`Cotización ${quote.numero_cotizacion}`}>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Image src="/logo.png" style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.title}>Cotización</Text>
            <Text style={styles.quoteNumber}>REF: {quote.numero_cotizacion}</Text>
            <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 5 }}>Fecha: {dateStr}</Text>
          </View>
        </View>

        {/* CLIENT INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Cliente</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cliente / Evento:</Text>
            <Text style={styles.infoValue}>
              {quote.clientes?.nombre_completo || quote.leads?.nombre_contacto || 'Cliente Directo'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo de Evento:</Text>
            <Text style={styles.infoValue}>{quote.tipo_evento || 'Servicio de Micheladas'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Capacidad (PAX):</Text>
            <Text style={styles.infoValue}>{quote.numero_personas} Invitados</Text>
          </View>
        </View>

        {/* DETAILS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Descripción del Servicio</Text>
            <Text style={styles.colQty}>PAX / Cant</Text>
            <Text style={styles.colPrice}>Precio U.</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>

          {/* PAQUETE */}
          {quote.paquetes_incluidos && quote.paquetes_incluidos.map((pkg, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.packageTitle}>Paquete: {pkg.nombre}</Text>
                <Text style={styles.packageItems}>Incluye: {pkg.items?.join(', ')}</Text>
              </View>
              <Text style={styles.colQty}>{quote.numero_personas}</Text>
              <Text style={styles.colPrice}>${quote.precio_por_persona}</Text>
              <Text style={styles.colTotal}>${(quote.numero_personas * quote.precio_por_persona).toLocaleString()}</Text>
            </View>
          ))}

          {/* EXTRAS */}
          {quote.servicios_adicionales && quote.servicios_adicionales.map((extra, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={{ fontSize: 10, color: '#1e293b' }}>{extra.nombre} (Servicio Adicional)</Text>
              </View>
              <Text style={styles.colQty}>1</Text>
              <Text style={styles.colPrice}>${extra.precio.toLocaleString()}</Text>
              <Text style={styles.colTotal}>${extra.precio.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal: </Text>
              <Text style={styles.totalValue}>${quote.subtotal?.toLocaleString()}</Text>
            </View>
            {quote.descuento > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Descuento: </Text>
                <Text style={[styles.totalValue, { color: '#f43f5e' }]}>- ${quote.descuento?.toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>Total:</Text>
              <Text style={styles.finalTotalValue}>${quote.subtotal?.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* TERMS */}
        <View style={{ marginTop: 40, padding: 15, backgroundColor: '#f8fafc', borderRadius: 10 }}>
           <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1e293b', marginBottom: 5, textTransform: 'uppercase' }}>Condiciones Comerciales</Text>
           <Text style={{ fontSize: 8, color: '#64748b', lineHeight: 1.5 }}>
             * Esta cotización tiene una validez hasta el {validUntilStr}.{'\n'}
             * Reserva de fecha con el 50% de anticipo.{'\n'}
             * Los precios incluyen montaje y servicio de barra libre según el tiempo estipulado.{'\n'}
             * El precio no incluye IVA, si se solicita factura se cobrara el 16%.
           </Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Si tienes alguna duda, contáctanos vía WhatsApp para atención inmediata.</Text>
          <Text style={styles.footerBrand}>LAS GROSERAS • LAS MEJORES MICHELADAS</Text>
        </View>
      </Page>
    </Document>
  );
};

export default QuotePDF;
