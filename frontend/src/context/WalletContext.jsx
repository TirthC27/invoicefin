import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BrowserProvider } from 'ethers';
import { POLYGON_AMOY } from '../lib/networkConfig';

/* ── Context ─────────────────────────────────────────────── */
const WalletContext = createContext(null);
export const useWallet = () => useContext(WalletContext);

const LS_KEY = 'yieldx_wallet_connected';

/* ── Provider ────────────────────────────────────────────── */
export function WalletProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected | connecting | connected | wrong_network
  const reconnecting = useRef(false);

  /* ── Switch to Polygon Amoy ──────────────────────────── */
  const switchToPolygonAmoy = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_AMOY.chainId }],
      });
    } catch (switchError) {
      // Chain not added → add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
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
    if (!window.ethereum) return null;
    const bp = new BrowserProvider(window.ethereum);
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
    if (!window.ethereum) {
      alert('MetaMask not detected. Please install MetaMask.');
      return;
    }

    setConnectionStatus('connecting');

    try {
      // Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        setConnectionStatus('disconnected');
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
        } catch {
          setWalletAddress(address);
          setConnectionStatus('wrong_network');
        }
      } else {
        setWalletAddress(address);
        setConnectionStatus('connected');
      }

      localStorage.setItem(LS_KEY, 'true');
    } catch (err) {
      console.error('Wallet connect error:', err);
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
  }, []);

  /* ── Event Handlers ──────────────────────────────────── */
  useEffect(() => {
    if (!window.ethereum) return;

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

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
      window.ethereum.removeListener('disconnect', handleDisconnect);
    };
  }, [disconnectWallet, setupProviderAndSigner]);

  /* ── Auto-reconnect on refresh ─────────────────────── */
  useEffect(() => {
    if (reconnecting.current) return;
    const wasConnected = localStorage.getItem(LS_KEY);
    if (wasConnected && window.ethereum) {
      reconnecting.current = true;
      window.ethereum.request({ method: 'eth_accounts' })
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
  }, [setupProviderAndSigner]);

  /* ── Context value ───────────────────────────────────── */
  const value = {
    walletAddress,
    chainId,
    provider,
    signer,
    connectionStatus,
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
