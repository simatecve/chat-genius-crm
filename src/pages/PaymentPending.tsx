import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

const PaymentPending = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Clock className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Pago Pendiente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Tu pago está siendo procesado. Te notificaremos cuando se complete la transacción.
          </p>
          <p className="text-sm text-muted-foreground">
            Esto puede tomar unos minutos. Una vez confirmado el pago, tu plan será activado automáticamente.
          </p>
          <div className="space-y-2 pt-4">
            <Button 
              onClick={() => navigate('/usage-plan')} 
              className="w-full"
            >
              Ver Estado de Mi Plan
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="w-full"
            >
              Volver al Inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentPending;