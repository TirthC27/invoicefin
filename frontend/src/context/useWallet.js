import { useContext } from 'react';
import { WalletContext } from './walletContextValue';

export const useWallet = () => useContext(WalletContext);
