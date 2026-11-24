'use client';

import { deleteDog } from '../actions';

export default function DeleteButton({ dogId }) {
	return (
		<button
			onClick={() => deleteDog(dogId)}
			style={{
				backgroundColor: '#ef4444',
				color: 'white',
				padding: '0.25rem 0.75rem',
				border: 'none',
				borderRadius: '4px',
				fontSize: '0.875rem',
				cursor: 'pointer',
			}}
		>
			Delete
		</button>
	);
}
