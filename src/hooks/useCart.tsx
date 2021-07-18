import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {

    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product: Product = await api.get(`/products/${productId}`).then(response => response.data);
      const productStock: Stock = await api.get(`/stock/${productId}`).then(response => response.data);
      const storagedProduct = cart.find(item => item.id === product.id);

      if (storagedProduct && productStock.amount > storagedProduct.amount) {
        const updatedProduct = cart.map((item) => {
          if (item.id === product.id) {
            item.amount += 1;
            return item;
          }
          return item;
        })
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProduct));
        setCart(updatedProduct);

      } else if (!storagedProduct && productStock.amount > 0) {
        const newProductArray: Product = { ...product, amount: + 1 };
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, newProductArray]));
        setCart([...cart, newProductArray]);
      }
      else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId);
      if (productExists) {
        const product = cart.filter(item => item.id !== productId);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(product));
        setCart(product);

      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        return;
      }

      const productStock: Stock = await api.get(`/stock/${productId}`).then(response => response.data);

      if (amount > productStock.amount) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      const newCartArray = [...cart];
      const productExists = newCartArray.find(item => item.id === productId);

      if (productExists) {
        productExists.amount = amount;
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCartArray));
        setCart(newCartArray);

      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
