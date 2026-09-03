import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PricingService } from '../services/pricing.services';
import { PricingRequest, PricingResponse } from '../models/pricing.model';

@Component({
  selector: 'app-pricing',
  imports: [FormsModule],
  templateUrl: './pricing.html',
  styleUrl: './pricing.css',
})
export class Pricing implements OnInit {

  private pricingService = inject(PricingService);
  private platformId = inject(PLATFORM_ID);

  availableLocations: string[] = ['Select Location'];

  pricingRequest: PricingRequest = {
    truckType: '',
    rentalDays: 1,
    estimatedMiles: 0,
    location: ''
  };

  pricingResponse?: PricingResponse;

  errorMessage = '';

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.availableLocations = [
        'Select Location',
        'HYDERABAD',
        'PUNE',
        'BANGALORE',
        'CHENNAI'
      ];
      return;
    }

    this.loadLocations();
  }

  loadLocations(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.pricingService.getAllTrucks().subscribe({
      next: (response) => {
        const locations = [...new Set(
          (response.data ?? [])
            .map((truck) => truck.location)
            .filter((location): location is string => Boolean(location?.trim()))
        )];

        this.availableLocations = ['Select Location', ...locations];
      },
      error: (error) => {
        console.error('Failed to load truck locations', error);
        this.availableLocations = [
          'Select Location',
          'HYDERABAD',
          'PUNE',
          'BANGALORE',
          'CHENNAI'
        ];
      }
    });
  }

  calculateQuote(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.errorMessage = 'Quote calculation is only available in the browser.';
      return;
    }

    this.errorMessage = '';
    this.pricingResponse = undefined;

    this.pricingService
      .calculateQuote(this.pricingRequest)
      .subscribe({
        next: (response) => {
          this.pricingResponse = response.data;
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = error.error?.message ?? 'Unable to calculate pricing';
        }
      });
  }
}
