import { TestBed } from '@angular/core/testing';

import { Documents } from './documents';

describe('Documents', () => {
  let service: Documents;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Documents);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
