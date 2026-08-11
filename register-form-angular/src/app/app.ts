import { Component } from '@angular/core';
import { RegisterForm } from './register/register-form/register-form';

@Component({
  selector: 'app-root',
  imports: [RegisterForm],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
