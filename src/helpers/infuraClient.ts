import { ethers } from "ethers";

let infuraProvider: ethers.providers.JsonRpcProvider;
if (process.env.NODE_ENV === "production") {
  infuraProvider = new ethers.providers.JsonRpcProvider("https://arbitrum-mainnet.infura.io/v3/2f7efd3a292149809ca5c503ee56d6f2");
} else {
  infuraProvider = new ethers.providers.JsonRpcProvider("https://arbitrum-mainnet.infura.io/v3/2f7efd3a292149809ca5c503ee56d6f2");
}

export default infuraProvider;
