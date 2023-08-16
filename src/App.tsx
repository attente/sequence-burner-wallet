import React, {useEffect} from 'react';
import logo from './logo.svg';
import './App.css';
import { ethers } from 'ethers'

import { sequence } from '0xsequence'

import { v2 } from '@0xsequence/core'
import { RpcRelayer } from '@0xsequence/relayer'
import { Orchestrator } from '@0xsequence/signhub'
import { Wallet } from '@0xsequence/wallet'

import { ETHAuth, Claims, validateClaims, Proof, ETHAuthVersion } from '@0xsequence/ethauth'

const context = v2.DeployedWalletContext;
const provider = new ethers.providers.JsonRpcProvider('https://nodes.sequence.app/polygon')
const relayer = new RpcRelayer({url: 'https://polygon-relayer.sequence.app', provider: provider})

function App() {
  const [proof, setProof] = React.useState<any>(null)
  const [address, setAddress] = React.useState<any>(null)
  const init = async () => {
    console.log(localStorage.getItem('privKey'))
    if(localStorage.getItem('privKey') == undefined){
      console.log('generate wallet')
      const walletEOA = ethers.Wallet.createRandom()
      createBurnerWallet(walletEOA)
      localStorage.setItem('privKey', walletEOA.privateKey)
    } else {
      console.log('load wallet')
      const walletEOA = new ethers.Wallet(localStorage.getItem('privKey')!, provider)
      const wallet = await createBurnerWallet(walletEOA)
      generateProof(wallet)
    }
  }
  useEffect(() => {
    init()
  }, [])

  const createBurnerWallet = async (walletEOA: any) => {
    // Initialize the wallet config
    const config = v2.config.ConfigCoder.fromSimple({
        threshold: 1,
        checkpoint: 0,
        signers: [{ weight: 1, address: walletEOA.address }]
    })

    // Create the wallet
    const relayerSequenceWallet = Wallet.newWallet({
        context: context,
        coders: v2.coders,
        config,
        provider,
        relayer,
        orchestrator: new Orchestrator([walletEOA]),
        chainId: 137
    })
    setAddress(relayerSequenceWallet.address)
    return relayerSequenceWallet;
  }

  const generateProof = async (wallet: any) => {

    // Step 1: Create the burner wallet, get its address.
    const address = await wallet.address

    // Step 2: Create a proof, and use it to get an auth token
    // from the SW API. Set that auth token in the rootStore
    const proof = new Proof({
      address,
      claims: {
        app: 'Skyweaver',
        iat: Math.round(new Date().getTime() / 1000),
        exp: Math.round(new Date().getTime() / 1000) + 60 * 60 * 24 * 365,
        v: ETHAuthVersion
      }
    })

    const ethAuth = new ETHAuth()

    const digest = proof.messageDigest()
    // wallet.
    const signature = await wallet.signMessage(digest)

    proof.signature = signature

    const ethAuthProofString = await ethAuth.encodeProof(proof, true)

    console.log(ethAuthProofString)
    console.log(address)

    const api = new sequence.api.SequenceAPIClient('https://api.sequence.app')
    const { isValid } = await api.isValidETHAuthProof({
      chainId: 'polygon', walletAddress: address, ethAuthProofString: ethAuthProofString
    })
    console.log(isValid) // true
    setProof(isValid)
  }

  return (
    <div className="App">
      {proof}
    </div>
  );
}

export default App;
