import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiResponse, PricingRequest, PricingResponse, Truck } from '../models/pricing.model';

@Injectable({
  providedIn: 'root',
})
export class PricingService {

  private http = inject(HttpClient);

  private readonly pricingApiUrl = '/pricing-api/api/v1/pricing';
  private readonly truckApiUrl = '/truck-api/api/v1/trucks';

  calculateQuote(request: PricingRequest) {
    return this.http.post<ApiResponse<PricingResponse>>(
      `${this.pricingApiUrl}/quote`,
      request
    );
  }

  getAllTrucks() {
    return this.http.get<ApiResponse<Truck[]>>(
      `${this.truckApiUrl}/getAllTrucks`
    );
  }
}
