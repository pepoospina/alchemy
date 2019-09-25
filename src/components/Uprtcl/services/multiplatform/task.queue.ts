import { offline } from "../../config";

type Dictionary<T> = { [key: string]: T };

export interface Task {
  id?: string;
  task: () => Promise<any>;
  dependsOn?: string;
}

const logEnabled = true;

function log(...args) {
  if (logEnabled) {
    console.log(...args);
  }
}

export class TaskQueue {
  interval = null;
  retryInterval: number; // Milliseconds
  retryEnabled = false;

  queue: Dictionary<Task> = {};
  finishedTasks: Dictionary<boolean> = {};
  dependenciesQueue: Dictionary<Task> = {};

  pendingListeners: Array<() => any> = [];
  finishedListeners: Array<() => any> = [];
  tasksPending: boolean = false;
  pendingResolve = null;
  pendingPromise: Promise<void> = null;

  constructor(retryEnabled: boolean = true, retryInterval: number = 100) {
    this.retryEnabled = retryEnabled;
    this.retryInterval = retryInterval;
  }

  public queueTask(task: Task): void {
    // Remove the task with the same id from the queue, if it existed
    if (!task.id) {
      task.id = Math.random().toString();
    }

    this.finishedTasks[task.id] = false;

    if (navigator.onLine || offline) {
      this.queue[task.id] = null;
      delete this.queue[task.id];

      log(
        '[TASK QUEUE] Received task: we are online, run task',
        task,
        this.queue
      );
      this.runTaskIfAble(task);
    } else {
      log(
        '[TASK QUEUE] Received task: we are offline, queue task',
        task,
        this.queue
      );
      this.queue[task.id] = task;
      this.scheduleTasksRun();
    }
  }

  private scheduleTasksRun() {
    if (this.interval == null) {
      this.interval = setInterval(() => this.runTasks(), this.retryInterval);
    }
  }

  private runTaskIfAble(task: Task) {
    if (task.dependsOn && this.finishedTasks[task.dependsOn] === false) {
      console.log('scheduling task for later');
      this.dependenciesQueue[task.id] = task;
    } else {
      if (!this.tasksPending) {
        this.tasksPending = true;
        this.pendingListeners.map(f => f());
        this.pendingPromise = new Promise(resolve => this.pendingResolve = resolve);
      }

      this.runTask(task);
    }
  }

  private runTasks() {
    if (navigator.onLine || offline) {
      log('[TASK QUEUE] Running tasks', this.queue);
      // Clear queue
      const queue = this.queue;
      this.queue = {};

      // Clear interval
      clearInterval(this.interval);
      this.interval = null;

      for (const taskId of Object.keys(queue)) {
        this.runTaskIfAble(queue[taskId]);
      }
    }
  }

  private async runTask(task: Task) {
    try {
      // Try to execute task
      await task.task();

      this.finishedTasks[task.id] = true;

      const dependantTasksIds = Object.keys(this.dependenciesQueue).filter(
        dependantTaskId =>
          this.dependenciesQueue[dependantTaskId].dependsOn === task.id
      );
      const dependantTasks: Dictionary<Task> = {};
      for (const taskId of dependantTasksIds) {
        dependantTasks[taskId] = this.dependenciesQueue[taskId];
        this.dependenciesQueue[taskId] = null;
        delete this.dependenciesQueue[taskId];
      }

      this.queue = { ...dependantTasks, ...this.queue };

      if (Object.keys(this.queue).length > 0) {
        this.scheduleTasksRun();
      }
    } catch (e) {
      if (this.retryEnabled && !navigator.onLine) {
        console.log(`Task failed, retrying when online`, task);

        if (this.queue[task.id] && this.queue[task.id] !== task) {
          return;
        }

        this.queue[task.id] = task;

        this.scheduleTasksRun();
      } else {
        console.log(`Task failed, not retrying`, task);
        // Task succeeded, delete the task from the dictionary
        this.finishedTasks[task.id] = true;

        this.queue[task.id] = null;
        delete this.queue[task.id];
      }
    }

    if (Object.keys(this.finishedTasks).every(key => this.finishedTasks[key])) {
      this.finishedListeners.map(f => f());
      this.tasksPending = false;
      this.pendingResolve();
    }
  }

  public onTasksPending(callback: () => any): void {
    this.pendingListeners.push(callback);
  }

  public onTasksFinished(callback: () => any): void {
    this.finishedListeners.push(callback);
  }

  public waitForAllTasks(): Promise<void> {
    return this.tasksPending ? this.pendingPromise : Promise.resolve();
  } 
}
