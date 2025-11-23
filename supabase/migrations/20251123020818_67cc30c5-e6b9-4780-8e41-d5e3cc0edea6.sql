-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  client_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_client FOREIGN KEY (client_id) REFERENCES public.leads(id) ON DELETE RESTRICT
);

-- Enable RLS on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Users can manage their own products"
ON public.products
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all products"
ON public.products
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Enable RLS on sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policies for sales
CREATE POLICY "Users can manage their own sales"
ON public.sales
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all sales"
ON public.sales
FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create trigger for updating updated_at on products
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating updated_at on sales
CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();