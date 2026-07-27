import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserProvider } from 'ethers';
import { POLYGON_AMOY } from '../lib/networkConfig';
import { WalletContext } from './walletContextValue';

/* ── Context ─────────────────────────────────────────────── */

const LS_KEY = 'Invoicefi_wallet_connected';

// Helper to target MetaMask explicitly in multi-wallet settings
const getMetaMaskProvider = () => {
  if (!window.ethereum) return null;
  if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
    return window.ethereum.providers.find(p => p.isMetaMask) || window.ethereum;
  }
  return window.ethereum;
};

/* ── Provider ────────────────────────────────────────────── */
export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected | connecting | connected | wrong_network
  const [walletError, setWalletError] = useState(null);
  const reconnecting = useRef(false);

  /* ── Switch to Polygon Amoy ──────────────────────────── */
  const switchToPolygonAmoy = useCallback(async () => {
    const providerObj = getMetaMaskProvider();
    if (!providerObj) return;
    try {
      await providerObj.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY.chainId }],
      });
    } catch (switchError) {
      // Chain not added → add it
      if (switchError.code === 4902) {
        await providerObj.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: POLYGON_AMOY.chainId,
            chainName: POLYGON_AMOY.chainName,
            nativeCurrency: POLYGON_AMOY.nativeCurrency,
            rpcUrls: POLYGON_AMOY.rpcUrls,
            blockExplorerUrls: POLYGON_AMOY.blockExplorerUrls,
          }],
        });
      } else {
        throw switchError;
      }
    }
  }, []);

  /* ── Setup provider + signer from MetaMask ───────────── */
  const setupProviderAndSigner = useCallback(async () => {
    const providerObj = getMetaMaskProvider();
    if (!providerObj) return null;
    const bp = new BrowserProvider(providerObj);
    const s = await bp.getSigner();
    const network = await bp.getNetwork();
    const cid = Number(network.chainId);

    setProvider(bp);
    setSigner(s);
    setChainId(cid);

    return { provider: bp, signer: s, chainId: cid };
  }, []);

  /* ── Connect Wallet ──────────────────────────────────── */
  const connectWallet = useCallback(async () => {
    const providerObj = getMetaMaskProvider();
    if (!providerObj) {
      setWalletError('MetaMask extension is required to interact with the blockchain. Please install MetaMask and try again.');
      return;
    }

    setWalletError(null);
    setConnectionStatus('connecting');

    try {
      // Request accounts
      const accounts = await providerObj.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        setConnectionStatus('disconnected');
    setWalletError(null);
        return;
      }

      const address = accounts[0];
      const result = await setupProviderAndSigner();

      if (!result) {
        setConnectionStatus('disconnected');
        return;
      }

      // Check chain
      if (result.chainId !== POLYGON_AMOY.chainIdDecimal) {
        setConnectionStatus('wrong_network');
        try {
          await switchToPolygonAmoy();
          // Re-read after switch
          await setupProviderAndSigner();
          setWalletAddress(address);
          setConnectionStatus('connected');
        } catch (switchErr) {
          setWalletAddress(address);
          setConnectionStatus('wrong_network');
          setWalletError(switchErr?.code === 4001
            ? 'Network switch was rejected in MetaMask.'
            : 'Wrong network. Please switch MetaMask to Polygon Amoy.');
        }
      } else {
        setWalletAddress(address);
        setConnectionStatus('connected');
      }

      localStorage.setItem(LS_KEY, 'true');
      localStorage.removeItem(LS_KEY + '_mock');
    } catch (err) {
      console.error('Wallet connect error:', err);
      setWalletError(err?.code === 4001
        ? 'Wallet connection was rejected in MetaMask.'
        : 'Unable to connect wallet. Check MetaMask and your Polygon Amoy RPC.');
      setConnectionStatus('disconnected');
    }
  }, [setupProviderAndSigner, switchToPolygonAmoy]);

  /* ── Disconnect Wallet ───────────────────────────────── */
  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setChainId(null);
    setProvider(null);
    setSigner(null);
    setConnectionStatus('disconnected');
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_KEY + '_mock');
  }, []);

  /* ── Event Handlers ──────────────────────────────────── */
  useEffect(() => {
    const providerObj = getMetaMaskProvider();
    if (!providerObj) return;

    const handleAccountsChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
      } else {
        setWalletAddress(accounts[0]);
        await setupProviderAndSigner();
      }
    };

    const handleChainChanged = async (newChainId) => {
      const cid = parseInt(newChainId, 16);
      setChainId(cid);

      if (cid !== POLYGON_AMOY.chainIdDecimal) {
        setConnectionStatus('wrong_network');
      } else {
        await setupProviderAndSigner();
        setConnectionStatus('connected');
      }
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    providerObj.on('accountsChanged', handleAccountsChanged);
    providerObj.on('chainChanged', handleChainChanged);
    providerObj.on('disconnect', handleDisconnect);

    return () => {
      providerObj.removeListener('accountsChanged', handleAccountsChanged);
      providerObj.removeListener('chainChanged', handleChainChanged);
      providerObj.removeListener('disconnect', handleDisconnect);
    };
  }, [disconnectWallet, setupProviderAndSigner]);

  /* ── Auto-reconnect on refresh ─────────────────────── */
  useEffect(() => {
    if (reconnecting.current) return;
    const wasConnected = localStorage.getItem(LS_KEY);

    if (wasConnected) {
      const providerObj = getMetaMaskProvider();
      if (providerObj) {
        reconnecting.current = true;
        providerObj.request({ method: 'eth_accounts' })
          .then(async (accounts) => {
            if (accounts && accounts.length > 0) {
              setWalletAddress(accounts[0]);
              const result = await setupProviderAndSigner();
              if (result && result.chainId === POLYGON_AMOY.chainIdDecimal) {
                setConnectionStatus('connected');
              } else if (result) {
                setConnectionStatus('wrong_network');
              }
            } else {
              localStorage.removeItem(LS_KEY);
            }
          })
          .catch(() => localStorage.removeItem(LS_KEY))
          .finally(() => { reconnecting.current = false; });
      }
    }
  }, [setupProviderAndSigner]);

  /* ── Context value ───────────────────────────────────── */
  const value = {
    walletAddress,
    chainId,
    provider,
    signer,
    connectionStatus,
    walletError,
    connectWallet,
    disconnectWallet,
    switchToPolygonAmoy,
    isConnected: connectionStatus === 'connected',
    isWrongNetwork: connectionStatus === 'wrong_network',
    truncatedAddress: walletAddress
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : null,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
