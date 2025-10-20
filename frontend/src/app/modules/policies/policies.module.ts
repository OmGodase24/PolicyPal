import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/policies-list/policies-list.component').then(m => m.PoliciesListComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./components/policy-form/policy-form.component').then(m => m.PolicyFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./components/policy-detail/policy-detail.component').then(m => m.PolicyDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./components/policy-form/policy-form.component').then(m => m.PolicyFormComponent)
  },
  {
    path: ':id/compliance',
    loadComponent: () => import('./components/compliance-report/compliance-report.component').then(m => m.ComplianceReportComponent)
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class PoliciesModule { }