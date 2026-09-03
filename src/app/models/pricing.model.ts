export interface PricingRequest {
  truckType: string;
  rentalDays: number;
  estimatedMiles: number;
  location: string;
}

export interface Truck {
  id: number;
  truckNumber: string;
  truckType: string;
  status: string;
  location: string;
  mileage: number;
  model: string;
  manufacturingYear: number;
}

export interface PricingResponse {
  quoteId: number;
  basePrice: number;
  mileageCharge: number;
  discount: number;
  tax: number;
  totalPrice: number;
  currency: string;
}

export interface ApiResponse<T>{
    message:string;
    statusCode:number;
    data:T;
}
