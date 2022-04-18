import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import contractAbi from './utils/contractAbi.json';
import { ethers } from 'ethers';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';
import { networks } from './utils/networks';
import Helmet from 'react-helmet';

const TWITTER_HANDLE_RISHAV = '0xrishavsharma';
const TWITTER_HANDLE_BUILDSPACE = '_buildspace';
const TWITTER_LINK_RISHAV = `https://twitter.com/${TWITTER_HANDLE_RISHAV}`;
const TWITTER_LINK_BUILDSPACE = `https://twitter.com/${TWITTER_HANDLE_BUILDSPACE}`;

// Defining the variables we'll need
const tld = '.savesoil';
const CONTRACT_ADDRESS = "0x2b4F4000d38Beeb2862f9412e625A8ADE4c9EAB6";

const App = () => {
	// A state variable to store user's public wallet.
	const [currentAccount, setCurrentAccount] = useState("");
	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');
	const [network, setNetwork] = useState('');
	const [editing, setEditing] = useState(false);
	const [loading, setLoading] = useState(false);
	const [mints, setMints] = useState([]);

	// Implementing the connect wallet method
	const connectWallet = async () => {
		try {
			const { ethereum } = window;
			if(!ethereum){
				alert("Get Metamask --> https://Metamask.io");
				return;
			}

			// Fancy method to request for account access
			const accounts = await ethereum.request({method: "eth_requestAccounts"});

			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);
		}catch(error){
			console.log(error);
	}
	}

	// Checking if wallet is connected
	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;

		if(!ethereum){
			console.log("Please install and login into your Metamask extension.");
			return;
		} else{
			console.log("We have the ethereum object", ethereum);
		}

		// Check if we are authorized to access user's wallet
		const accounts = await ethereum.request({ method: 'eth_accounts' });

		// Users can have multiple authorized accounts, we'll grab the very first one if it's there.
		if(accounts.length !== 0){
			const account = accounts[0];
			console.log(`Found an authorized account: ${account}`);
            setCurrentAccount(account);       // ***
		} else{
			console.log("No authorized account found!");
		}

		// We'll check the network Chain ID
		const chainId = await ethereum.request({ method: "eth_chainId" });
		setNetwork(networks[chainId]);

		ethereum.on('changeChanged', handleChainChanged);

		// Reload the page if user change networks
		function handleChainChanged(){
			ethereum.location.reload();
		}

	};

	// Adding a button which upon clicking will automatically prompt user to change the current network to Polygon
	const switchNetwork = async () => {
		if (window.ethereum) {
		  try {
			// Try to switch to the Mumbai testnet
			await window.ethereum.request({
			  method: 'wallet_switchEthereumChain',
			  params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
			});
		  } catch (error) {
			// This error code means that the chain we want has not been added to MetaMask
			// In this case we ask the user to add it to their MetaMask
			if (error.code === 4902) {
			  try {
				await window.ethereum.request({
				  method: 'wallet_addEthereumChain',
				  params: [
					{	
					  chainId: '0x13881',
					  chainName: 'Polygon Mumbai Testnet',
					  rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
					  nativeCurrency: {
						  name: "Mumbai Matic",
						  symbol: "MATIC",
						  decimals: 18
					  },
					  blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
					},
				  ],
				});
			  } catch (error) {
				console.log(error);
			  }
			}
			console.log(error);
		  }
		} else {
		  // If window.ethereum is not found then MetaMask is not installed
		  alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		} 
	  }
   
	const mintDomain = async () => {
		// Don't run if the domain is empty
		if(!domain){return;}
		else if(domain.length<3){   // ***
			alert('The domain must have at least 3 characters');
			return;
		}
		const price = domain.length === 3 ? '0.4' : (3 > domain.length && domain.length >= 10) ? '0.3' : '0.2';
		// const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		console.log("Minting domain", domain, "with Price", price);
		alert(`Minting domain ${domain} with price ${price}`);

		try{
			const {ethereum} = window;
			if(ethereum){
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);

				console.log("Going to pop the wallet to pay gas...");

				let tx = await contract.register(domain, {value: ethers.utils.parseEther(price), gasLimit: 3500000});
				// Waiting for the transaction to be mined
				const receipt = await tx.wait();

				if(receipt.status === 1){
					console.log("Record set! https//:mumbai.polygonscan.com/tx" + tx.hash);

					// Setting the record for the domain
					tx = await contract.setRecord(domain, record);
					await tx.wait();

					console.log("Record is set! https//:mumbai.polygonscan.com/tx" + tx.hash);

					// Call fetchMints after 2 seconds
					setTimeout(() =>{
						fetchMints();
					}, 2000);

					setRecord('');
					setDomain('');
				}else{
					alert("Transaction failed. Please try again!");
				}
			}

		}catch(error){
			alert(error);
		}
	}

	const fetchMints = async () => {
		try {
		  const { ethereum } = window;
		  if (ethereum) {
			// You know all this
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
			  
			// Get all the domain names from our contract
			console.log("Before calling the function in contract");
			const names = await contract.getAllNames();
			  
			// For each name, get the record and the address
			const mintRecords = await Promise.all(names.map(async (name) => {
			const mintRecord = await contract.records(name);
			const owner = await contract.domains(name);
			return {
			  id: names.indexOf(name),
			  name: name,
			  record: mintRecord,
			  owner: owner,
			};
		  }));
	  
		  console.log("MINTS FETCHED ", mintRecords);
		  setMints(mintRecords);
		  }
		} catch(error){
		  console.log(error);
		}
	}
	  
	  // This will run any time currentAccount or network are changed
	  useEffect(() => {
		if (network === 'Polygon Mumbai Testnet') {
		  fetchMints();
		}
	  }, [currentAccount, network]);
	  
	  // This will run any time currentAccount or network are changed
	  useEffect(() => {
		if (network === 'Polygon Mumbai Testnet') {
		  fetchMints();
		}
	  }, [currentAccount, network]);
	


	  const renderMints = () => {
		if (currentAccount && mints.length > 0) {
		  return (
			<div className="mint-container">
			  <p className="subtitle"> Recently minted domains!</p>
			  <div className="mint-list">
				{ mints.map((mint, index) => {
				  return (
					<div className="mint-item" key={index}>
					  <div className='mint-row'>
						<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
						  <p className="underlined">{' '}{mint.name}{tld}{' '}</p>
						</a>
						{/* If mint.owner is currentAccount, add an "edit" button*/}
						{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
						  <button className="edit-button" onClick={() => editRecord(mint.name)}>
							<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
						  </button>
						  :
						  null
						}
					  </div>
				<p> {mint.record} </p>
			  </div>)
			  })}
			</div>
		  </div>);
		}
	  };
	  
	  
	  // This will take us into edit mode and show us the edit buttons!
	  const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setDomain(name);
	  }

	// This will run any time currentAccount or network are changed
	useEffect(() => { if(network === 'Polygon Mumbai Testnet'){ fetchMints();} },[currentAccount, network]);

	const updateDomain = async () => {
		if (!record || !domain) { return }
		setLoading(true);
		console.log("Updating domain", domain, "with record", record);
		  try {
		  const { ethereum } = window;
		  if (ethereum) {
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
	  
			let tx = await contract.setRecord(domain, record);
			await tx.wait();
			console.log("Record set https://mumbai.polygonscan.com/tx/"+tx.hash);
	  
			fetchMints();
			setRecord('');
			setDomain('');
		  }
		  } catch(error) {
			console.log(error);
		  }
		setLoading(false);
	  }

	// Create a function to render if the wallet is not connected yet
	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://media.giphy.com/media/MO2RzWsxy5gCcqObjF/giphy.gif" alt="Save Soil Giphy" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
	);

	// Form for domain name and data
	const inputForm = () => {
		  if (network !== 'Polygon Mumbai Testnet') {
				return (
				  <div className="connect-wallet-container">
					  <p>Please connect to the Polygon Mumbai Testnet</p>
					  <button className="cta-button mint-button switch-to-mm" onClick={switchNetwork}>Click here to switch</button>
				  </div>
				);
			}
		return(
			<div className="form-container">

			

				<div className="first-row">
					<input type="text" value={domain} placeholder='domain' onChange={e => setDomain(e.target.value)} />
					<p className="tld"> {tld} </p>
				</div>
				<input type="text" value={record} placeholder='How would you contribute?' onChange={e => setRecord(e.target.value)} />
				
				{editing ? (
				<div className="button-container">
						<button className="cta-button mint-button" disabled={loading} onClick={updateDomain}> Set Record </button>
						<button className="cta-button mint-button" onClick={() => {setEditing(false)}}> Cancel </button>
				</div>
					):(
						<button className='cta-button mint-button' disabled={null} onClick={mintDomain}> Mint </button>
					)}
			</div>
		);
	}

	// This runs our function when page loads
	useEffect(() => { checkIfWalletIsConnected(); },);

  return (
		<div className="App">

			<Helmet>
                <meta charSet="utf-8" />
                <title>Eco Booster Domain Service</title>
                {/* <link rel="canonical" href="https://mysite.com/example" /> */}
				<meta name="description" content="Save Soil Domain Service - A step towards making the soil rich in organic content. #SaveSoil #LetsMakeItHappen #ConciousPlanet" />
            </Helmet>

			<div className="container">
				<div className="header-container">
					<header>
						<div className="left">
							<p className="title">Save Soil Name Service 🪴</p>
							<p className="subtitle">A step towards saving life on Earth</p>
						</div>
						<div className="right">
							{/* <img src={ network.includes("Polygon") ? polygonLogo : ethLogo } alt="Network Logo" className="logo" />
							{ currentAccount ? <p> Wallet : {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not Connected</p> } */}
							<img alt="Network logo" className="logo" src={ network.includes("Polygon") ? polygonLogo : ethLogo} />
							{ currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>
				</div>

				
				{/* Hide the connect button if currentAccount isn't empty*/}
				{/* This line will works only if the condition before && is true otherwise the component wouldn't render */}
				{!currentAccount && renderNotConnectedContainer()}
				
				{/* Render the form if the wallet is connected */}
				{currentAccount && inputForm()}
				{mints && renderMints()}

        		<div className="footer-container">
					<div className="rishav-container">
						<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
						<a className="footer-text" href={TWITTER_LINK_RISHAV} target="_blank" rel="noreferrer" >{`Built by ${TWITTER_HANDLE_RISHAV}`}</a>
					</div>
					<div className="buildspace-container">
						{/* <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} /> */}
						<a className="footer-text" href={TWITTER_LINK_BUILDSPACE} target="_blank" rel="noreferrer" >{`By learning from ${TWITTER_HANDLE_BUILDSPACE}`}</a>
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
