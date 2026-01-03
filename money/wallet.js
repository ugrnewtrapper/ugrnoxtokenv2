const CFG={
chainId:56,
chainHex:"0x38",
rpc:"https://bsc-dataseed.binance.org/",
payment:"0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
token:"0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8",
wc:"82a100d35a9c24cb871b0fec9f8a9671"
};

const PAY_ABI=[
"function payForAnalysis()",
"function pricePerAnalysis() view returns(uint256)"
];

const ERC20_ABI=[
"function approve(address,uint256)",
"function allowance(address,address) view returns(uint256)"
];

let provider,signer,user,wcProvider;

function status(t){document.getElementById("status").innerText=t}
function unlock(){document.getElementById("analyzeBtn").classList.remove("locked")}

async function switchBSC(p){
try{
await p.send("wallet_switchEthereumChain",[{"chainId":CFG.chainHex}]);
}catch(e){
if(e.code===4902){
await p.send("wallet_addEthereumChain",[{
chainId:CFG.chainHex,
chainName:"BSC Mainnet",
rpcUrls:[CFG.rpc],
nativeCurrency:{name:"BNB",symbol:"BNB",decimals:18}
}]);
}else throw e;
}
}

async function connectInjected(){
status("Conectando...");
provider=new ethers.BrowserProvider(window.ethereum);
await provider.send("eth_requestAccounts",[]);
await switchBSC(provider);
provider=new ethers.BrowserProvider(window.ethereum);
signer=await provider.getSigner();
user=await signer.getAddress();
unlock();
status("Conectado:\n"+user);
}

async function connectWalletConnect(){
status("Abrindo QR...");
wcProvider=await WalletConnectEthereumProvider.init({
projectId:CFG.wc,
chains:[56],
showQrModal:true,
rpcMap:{56:CFG.rpc}
});
await wcProvider.connect();
provider=new ethers.BrowserProvider(wcProvider);
signer=await provider.getSigner();
user=await signer.getAddress();
unlock();
status("Conectado:\n"+user);
}

async function analyze(){
try{
status("Processando pagamento...");
const token=new ethers.Contract(CFG.token,ERC20_ABI,signer);
const pay=new ethers.Contract(CFG.payment,PAY_ABI,signer);
const price=await pay.pricePerAnalysis();
const allow=await token.allowance(user,CFG.payment);

if(allow<price){
const tx=await token.approve(CFG.payment,price);
await tx.wait();
}

const tx2=await pay.payForAnalysis();
await tx2.wait();
status("Pagamento confirmado");
}catch(e){
status("Erro: "+(e.reason||e.message));
}
}

window.connectInjected=connectInjected;
window.connectWalletConnect=connectWalletConnect;
window.analyze=analyze;
