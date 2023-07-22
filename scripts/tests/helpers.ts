import {
  LiFi,
  ChainId,
  ContractCallQuoteRequest,
  LifiStep,
  ConfigUpdate,
  QuoteRequest,
} from "@lifi/sdk";
import { Bytes, BytesLike, ethers } from "ethers";

let lifi: LiFi;
export const getLifi = () => {
  if (!lifi) {
    lifi = new LiFi({ integrator: "Tars" });
  }
  return lifi;
};

export const lifiGetSameChainQuote = async (
  fromChain: ChainId,
  fromToken: string,
  toToken: string,
  userAddress: string,
  amount: string
): Promise<LifiStep> => {
  // quote
  const quoteRequest: QuoteRequest = {
    fromChain,
    fromToken,
    fromAddress: userAddress,
    fromAmount: amount,
    toChain: fromChain, //same chain
    toToken: toToken,
  };

  return getLifi().getQuote(quoteRequest);
};

export const lifiGetCrossChainQuote = async (
  fromChain: ChainId,
  toChain: ChainId,
  fromToken: string,
  toToken: string,
  fromAddress: string,
  toAddress: string,
  amount: string
): Promise<LifiStep> => {
  // quote
  const quoteRequest: QuoteRequest = {
    fromChain,
    fromToken,
    fromAddress,
    fromAmount: amount,
    toChain,
    toToken,
    toAddress,
  };

  return await getLifi().getQuote(quoteRequest);
};

export const lifiGetCrossChainWithExecQuote = async (
  fromChain: ChainId,
  toChain: ChainId,
  fromToken: string,
  toToken: string,
  fromAddress: string,
  toAddress: string,
  toContract: string,
  amount: string,
  approvalAddress: string,
  data: BytesLike
): Promise<LifiStep> => {
  const LIFI_FACET_ABI = [
    "function lifiBridgeReceiver(address _tokenReceived, address _sender, address _approvalAddress, uint256 _sourceAssetInAmount, bytes calldata _data) external", // UPDATE!!
  ];

  //  "function lifiBridgeReceiver(address _tokenReceived, address _sender, address _approvalAddress, uint256 _sourceAssetInAmount, bytes calldata _data) external"

  const GAS_LIMIT = "750000";

  const contract = new ethers.Contract(toContract, LIFI_FACET_ABI);
  const remoteTx = await contract.populateTransaction.lifiBridgeReceiver(
    toToken,
    toAddress,
    approvalAddress,
    amount,
    data
  );

  // quote
  const quoteRequest: ContractCallQuoteRequest = {
    fromChain,
    fromToken,
    fromAddress,
    toChain,
    toToken,
    toAmount: amount,
    toContractAddress: remoteTx.to!,
    toContractCallData: remoteTx.data!,
    toContractGasLimit: GAS_LIMIT,
  };

  return await getLifi().getContractCallQuote(quoteRequest);
};
