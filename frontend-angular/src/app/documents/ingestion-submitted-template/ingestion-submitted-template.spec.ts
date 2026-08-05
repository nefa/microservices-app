import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngestionSubmittedTemplate } from './ingestion-submitted-template';

describe('IngestionSubmittedTemplate', () => {
  let component: IngestionSubmittedTemplate;
  let fixture: ComponentFixture<IngestionSubmittedTemplate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngestionSubmittedTemplate],
    }).compileComponents();

    fixture = TestBed.createComponent(IngestionSubmittedTemplate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
