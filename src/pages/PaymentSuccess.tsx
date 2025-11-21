import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');

  useEffect(() => {
    const updateSubscription = async () => {
      if (status === 'approved' && paymentId) {
        console.log('Payment approved - updating subscription');
        // La suscripción ya debería estar actualizada por el webhook
        // pero podemos verificar el estado aquí si es necesario
      }
    };
    
    updateSubscription();
  }, [paymentId, status]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">¡Pago Exitoso!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Tu pago ha sido procesado correctamente. Tu plan ha sido activado y ya puedes disfrutar de todos los beneficios.
          </p>
          {paymentId && (
            <p className="text-sm text-muted-foreground">
              ID de transacción: {paymentId}
            </p>
          )}
          <div className="pt-4">
            <Button 
              onClick={() => navigate('/usage-plan')} 
              className="w-full"
            >
              Ver Mi Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;