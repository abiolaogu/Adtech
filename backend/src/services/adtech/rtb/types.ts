export interface BidRequest {
  requestId: string;
  placementId: string;
  publisherId: string;
  inventoryType: string;
  deviceType: string;
  country: string;
  floorPrice: number;
  userContext?: Record<string, any>;
  timestamp: Date;
}

export interface BidResponse {
  bidId: string;
  campaignId: string;
  advertiserId: string;
  bidPrice: number;
  creativeId?: string;
  metadata?: Record<string, any>;
}

export interface AuctionResult {
  auctionId: string;
  winningBid: BidResponse | null;
  clearingPrice: number;
  allBids: BidResponse[];
  bidRequest: BidRequest;
  timestamp: Date;
}
