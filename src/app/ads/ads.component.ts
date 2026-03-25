import { Component, Input, AfterViewInit } from '@angular/core';

declare var window: any;

@Component({
  selector: 'app-ads',
  standalone: true, // ✅ IMPORTANT
  templateUrl: './ads.component.html'
})
export class AdsComponent implements AfterViewInit {

  @Input() adSlot!: string;

  ngAfterViewInit(): void {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('Erreur AdSense', e);
    }
  }
}
