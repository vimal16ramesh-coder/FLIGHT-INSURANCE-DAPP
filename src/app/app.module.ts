// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { BuyPolicyComponent } from './pages/buy-policy/buy-policy.component';
import { MyPoliciesComponent } from './pages/my-policies/my-policies.component';
import { ClaimStatusComponent } from './pages/claim-status/claim-status.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { ContractDetailsComponent } from './pages/contract-details/contract-details.component';

@NgModule({
  declarations: [
    AppComponent,
    BuyPolicyComponent,
    MyPoliciesComponent,
    ClaimStatusComponent,
    AdminDashboardComponent,
    ContractDetailsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
