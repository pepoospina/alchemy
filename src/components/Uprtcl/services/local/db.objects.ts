import {
  Perspective as IPerspective,
  Commit as ICommit
} from '../../types';

export class Perspective implements IPerspective {
  id: string;
  origin: string;
  creatorId: string;
  timestamp: number;
  context: string;
  name: string;

  constructor(_origin, _creatorId, _timestamp, _context, _name) {
    this.id = null;
    this.origin = _origin;
    this.creatorId = _creatorId;
    this.timestamp = _timestamp;
    this.context = _context;
    this.name = _name;
  }
}

export class Commit implements ICommit {
  id?: string;
  creatorId: string;
  timestamp: number;
  message: string;
  parentsIds: string[];
  dataId: string;

  constructor(_creatorId, _timestamp, _message, _parentsIds, _dataId) {
    this.id = null;
    this.creatorId = _creatorId;
    this.timestamp = _timestamp;
    this.message = _message;
    this.parentsIds = _parentsIds;
    this.dataId = _dataId;
  }
}

