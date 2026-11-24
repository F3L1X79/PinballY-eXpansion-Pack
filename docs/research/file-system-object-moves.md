# Scripting.FileSystemObject: MoveFile and MoveFolder

What the host's `renameFile` and `renameFolder` (`common/core/pinbally_host.js`) rely on, and what the fake host (`tests/support/fake_pinbally_host.js`) reproduces. Source: Microsoft's Scripting Runtime reference, `MoveFile` and `MoveFolder` methods.

- `MoveFile(source, destination)` moves one file. If `destination` is an existing file, an error occurs: a move never overwrites. A missing `source` is an error too.
- `MoveFolder(source, destination)` moves the folder with everything in it, files and sub-folders. If `destination` is an existing file or folder, an error occurs (a `destination` ending in a path separator instead means "move into that folder", which the pack never passes). A missing `source` is an error.
- Neither creates the destination's parent folder: it must exist.
- On the same volume both are renames: nothing is copied, and the moved folder keeps its files' dates.
- Not in that reference, but how Windows behaves: a file of the folder held open by another program can make the move fail ("Permission denied"); the fake host's `failNextFolderRename()` stands for that case, and the pack treats it as nothing moved. To check on the cabinet.
