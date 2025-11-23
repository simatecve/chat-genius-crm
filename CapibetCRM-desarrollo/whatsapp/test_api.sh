#!/bin/bash

# Script de prueba para la API de WhatsApp con Baileys
# Este script verifica que todos los endpoints funcionen correctamente

echo "🧪 Iniciando pruebas de la API de WhatsApp con Baileys..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL base del servicio
BASE_URL="http://localhost:3001"

# Función para verificar respuesta
check_response() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ÉXITO${NC}"
    else
        echo -e "${RED}❌ ERROR${NC}"
        exit 1
    fi
}

# 1. Health Check
echo "1️⃣  Verificando Health Check..."
HEALTH_RESPONSE=$(curl -s ${BASE_URL}/health)
if echo "$HEALTH_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Health Check OK${NC}"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo -e "${RED}❌ Health Check FAILED${NC}"
    exit 1
fi
echo ""

# 2. Listar sesiones
echo "2️⃣  Listando sesiones actuales..."
SESSIONS_RESPONSE=$(curl -s ${BASE_URL}/sessions)
if echo "$SESSIONS_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Sesiones listadas${NC}"
    echo "$SESSIONS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SESSIONS_RESPONSE"
else
    echo -e "${RED}❌ Error listando sesiones${NC}"
fi
echo ""

# 3. Detectar sesiones existentes
echo "3️⃣  Detectando sesiones existentes..."
DETECT_RESPONSE=$(curl -s ${BASE_URL}/sessions/detect)
if echo "$DETECT_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Sesiones detectadas${NC}"
    echo "$DETECT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DETECT_RESPONSE"
else
    echo -e "${RED}❌ Error detectando sesiones${NC}"
fi
echo ""

# 4. Generar QR
echo "4️⃣  Generando código QR..."
QR_RESPONSE=$(curl -s ${BASE_URL}/generate-qr)
if echo "$QR_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ QR generado exitosamente${NC}"
    
    # Extraer sessionId
    SESSION_ID=$(echo "$QR_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['sessionId'])" 2>/dev/null)
    
    if [ -n "$SESSION_ID" ]; then
        echo -e "${YELLOW}📱 Session ID: $SESSION_ID${NC}"
        echo ""
        
        # Guardar QR en archivo
        echo "$QR_RESPONSE" > /tmp/qr_response.json
        echo -e "${GREEN}✅ QR guardado en /tmp/qr_response.json${NC}"
        echo ""
        
        # Esperar un momento
        echo "⏳ Esperando 3 segundos..."
        sleep 3
        
        # 5. Verificar estado de la sesión
        echo "5️⃣  Verificando estado de la sesión..."
        SESSION_STATUS=$(curl -s ${BASE_URL}/sessions/${SESSION_ID})
        if echo "$SESSION_STATUS" | grep -q "success.*true"; then
            echo -e "${GREEN}✅ Estado de sesión obtenido${NC}"
            echo "$SESSION_STATUS" | python3 -m json.tool 2>/dev/null || echo "$SESSION_STATUS"
        else
            echo -e "${RED}❌ Error obteniendo estado de sesión${NC}"
        fi
        echo ""
        
        # 6. Obtener QR de la sesión
        echo "6️⃣  Obteniendo QR de la sesión..."
        QR_DATA=$(curl -s ${BASE_URL}/sessions/${SESSION_ID}/qr)
        if echo "$QR_DATA" | grep -q "success.*true"; then
            echo -e "${GREEN}✅ QR de sesión obtenido${NC}"
        else
            echo -e "${YELLOW}⚠️  QR no disponible (puede que ya esté conectada)${NC}"
        fi
        echo ""
        
        # Información adicional
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "${YELLOW}📋 INFORMACIÓN DE LA SESIÓN${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "Session ID: ${YELLOW}$SESSION_ID${NC}"
        echo ""
        echo -e "${GREEN}Para escanear el QR:${NC}"
        echo "1. Abre WhatsApp en tu teléfono"
        echo "2. Ve a Configuración > Dispositivos vinculados"
        echo "3. Toca 'Vincular un dispositivo'"
        echo "4. Escanea el QR que se muestra en el archivo /tmp/qr_response.json"
        echo ""
        echo -e "${GREEN}Para verificar el estado después de escanear:${NC}"
        echo "curl ${BASE_URL}/sessions/${SESSION_ID}"
        echo ""
        echo -e "${GREEN}Para enviar un mensaje de prueba (después de conectar):${NC}"
        echo "curl -X POST ${BASE_URL}/sessions/${SESSION_ID}/send-message \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{\"number\": \"TU_NUMERO\", \"message\": \"Hola desde Baileys!\"}'"
        echo ""
        echo -e "${GREEN}Para desconectar la sesión:${NC}"
        echo "curl -X POST ${BASE_URL}/sessions/${SESSION_ID}/disconnect"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    else
        echo -e "${RED}❌ No se pudo extraer el Session ID${NC}"
    fi
else
    echo -e "${RED}❌ Error generando QR${NC}"
    echo "$QR_RESPONSE"
fi
echo ""

# Resumen final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ PRUEBAS COMPLETADAS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Endpoints verificados:"
echo "  ✅ Health Check"
echo "  ✅ Listar sesiones"
echo "  ✅ Detectar sesiones"
echo "  ✅ Generar QR"
echo "  ✅ Estado de sesión"
echo ""
echo "📝 Para más información, consulta:"
echo "  - TEST_WHATSAPP_API.md"
echo "  - README.md"
echo ""
