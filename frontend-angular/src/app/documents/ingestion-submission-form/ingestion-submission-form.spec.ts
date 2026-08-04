import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngestionSubmissionForm } from './ingestion-submission-form';

describe('IngestionSubmissionForm', () => {
  let component: IngestionSubmissionForm;
  let fixture: ComponentFixture<IngestionSubmissionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngestionSubmissionForm],
    }).compileComponents();

    fixture = TestBed.createComponent(IngestionSubmissionForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
