import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BuyPolicyComponent } from './pages/buy-policy/buy-policy.component';
import { MyPoliciesComponent } from './pages/my-policies/my-policies.component';
import { ClaimStatusComponent } from './pages/claim-status/claim-status.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';


const routes: Routes = [
  { path: '', redirectTo: 'buy-policy', pathMatch: 'full' },
  { path: 'buy-policy', component: BuyPolicyComponent },
  { path: 'my-policies', component: MyPoliciesComponent },
  { path: 'claim-status', component: ClaimStatusComponent },
  { path: '**', redirectTo: 'buy-policy' }, 
  { path: 'admin', component: AdminDashboardComponent }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
