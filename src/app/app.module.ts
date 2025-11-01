import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms'; // Needed for ngModel two-way binding

import { AppRoutingModule } from './app-routing.module'; // Your routing module
import { AppComponent } from './app.component';

// Import your created components here
import { BuyPolicyComponent } from './pages/buy-policy/buy-policy.component';
import { MyPoliciesComponent } from './pages/my-policies/my-policies.component';
import { ClaimStatusComponent } from './pages/claim-status/claim-status.component';
// import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component'; // admin disabled
import { ContractDetailsComponent } from './pages/contract-details/contract-details.component';

@NgModule({
  declarations: [
    AppComponent,
    BuyPolicyComponent,
    MyPoliciesComponent,
    ClaimStatusComponent,
    ContractDetailsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule, // Add FormsModule here
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
