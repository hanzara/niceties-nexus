import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Smartphone, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePaystackIntegration } from '@/hooks/usePaystackIntegration';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const paymentMethods = [
  { id: 'mobile_money', name: 'M-PESA', icon: Smartphone, description: 'Pay with M-PESA mobile money', channel: 'mobile_money' },
  { id: 'mobile_money_airtel', name: 'Airtel Money', icon: Smartphone, description: 'Pay with Airtel Money', channel: 'mobile_money' },
  { id: 'card', name: 'Debit/Credit Card', icon: CreditCard, description: 'Pay with your bank card', channel: 'card' },
];

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { initializePayment: initializePaystackPayment, isProcessingPayment: isProcessingPaystack } = usePaystackIntegration();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !paymentMethod) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number for mobile money
    if ((paymentMethod === 'mobile_money' || paymentMethod === 'mobile_money_airtel') && !phoneNumber) {
      toast({
        title: "Error",
        description: "Phone number is required for mobile money payments",
        variant: "destructive",
      });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (numericAmount <= 0 || numericAmount > 100000) {
      toast({
        title: "Error",
        description: "Amount must be between KES 1 and KES 100,000",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedMethod = paymentMethods.find(m => m.id === paymentMethod);
      
      await initializePaystackPayment.mutateAsync({
        email: user?.email,
        amount: numericAmount,
        purpose: 'other',
        description: `Wallet top-up via ${selectedMethod?.name}`,
        phoneNumber: phoneNumber || undefined,
        channels: [selectedMethod?.channel || 'card']
      });

      toast({
        title: "Payment Initiated",
        description: paymentMethod === 'card' 
          ? "Complete payment on the Paystack page"
          : "Check your phone for payment prompt",
      });

      setAmount('');
      setPaymentMethod('');
      setPhoneNumber('');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Add money error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add money. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedMethod = paymentMethods.find(method => method.id === paymentMethod);
  const isLoading = isProcessingPaystack;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Money to Wallet</DialogTitle>
          <DialogDescription>
            Top up your wallet with M-PESA, Airtel Money, or Card
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max="100000"
              step="1"
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Select Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Card key={method.id} className={`cursor-pointer transition-colors ${paymentMethod === method.id ? 'border-primary bg-primary/5' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Icon className="h-6 w-6 text-primary" />
                        <div className="flex-1">
                          <label htmlFor={method.id} className="font-medium cursor-pointer">
                            {method.name}
                          </label>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </RadioGroup>
          </div>

          {(paymentMethod === 'mobile_money' || paymentMethod === 'mobile_money_airtel') && (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="2547XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                You'll receive an STK push to confirm payment
              </p>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                💳 You'll be redirected to enter your card details securely on Paystack
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Processing...' : 'Add Money'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};