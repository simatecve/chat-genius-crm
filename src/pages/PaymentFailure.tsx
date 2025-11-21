import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

const PaymentFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Pago Fallido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            No se pudo procesar tu pago. Por favor, intenta nuevamente o contacta con soporte si el problema persiste.
          </p>
          <div className="space-y-2 pt-4">
            <Button 
              onClick={() => navigate('/payment-plans')} 
              className="w-full"
            >
              Intentar Nuevamente
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

export default PaymentFailure;