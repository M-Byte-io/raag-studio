/**
 * Undo/Redo Infrastructure
 * 
 * Supports non-linear editing (adding annotations, creating loops, splitting regions).
 */

export class CommandManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
  }

  /**
   * Executes a command and adds it to the undo stack.
   * @param {ICommand} command 
   */
  execute(command) {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const command = this.redoStack.pop();
    command.execute();
    this.undoStack.push(command);
  }
}

/**
 * Interface for all Commands.
 */
export class ICommand {
  execute() { throw new Error('Not implemented'); }
  undo() { throw new Error('Not implemented'); }
}

export const commandManager = new CommandManager();
