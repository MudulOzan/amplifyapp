import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Storage } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';

import awsExports from './aws-exports';
Amplify.configure(awsExports);

const initialFormState = { name: '', description: '' }
interface Note {
  id?: number,
  name?: string,
  description?: string,
  image?: string
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [formData, setFormData] = useState<Note>(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData: any = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(notesFromAPI.map(async (note: Note) => {
      if (note.image) {
        const image = await Storage.get(note.image);
        note.image = image;
      }
      return note;
    }))
    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    setNotes([...notes, formData]);
    setFormData(initialFormState);
  }

  async function deleteNote({ id }: Note) {
    const newNotesArray = notes.filter((note: Note) => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } } });
  }

  async function onChange(e: React.ChangeEvent<any>) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }
  return (
    <Authenticator socialProviders={['amazon', 'apple', 'facebook', 'google']}>
      {({ signOut }) => (
        <div className="App">
          <h1>My Notes App</h1>
          <input
            onChange={e => setFormData({ ...formData, 'name': e.target.value })}
            placeholder="Note name"
            value={formData.name}
          />
          <input
            onChange={e => setFormData({ ...formData, 'description': e.target.value })}
            placeholder="Note description"
            value={formData.description}
          />
          <input
            type="file"
            onChange={onChange}
          />
          <button onClick={createNote}>Create Note</button>
          <div style={{ marginBottom: 30 }}>
            {
              notes.map(note => (
                <div key={note.id || note.name}>
                  <h2>{note.name}</h2>
                  <p>{note.description}</p>
                  <button onClick={() => deleteNote(note)}>Delete note</button>
                  {
                    note.image && <img src={note.image} style={{ width: 400 }} />
                  }
                </div>
              ))
            }
          </div>
          <button onClick={signOut}>Sign out</button>
        </div>
      )}
    </Authenticator>

  );
}

export default App;