import { listDogs, createDog } from '../actions';
import DeleteButton from '../ui/DeleteButton';
import { AGE_INPUT_PATTERN, RAW_LENGTH_LIMIT, wordsInputPattern } from '../dogInput';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';

export default async function Page() {
	// Load dogs from server action
	const dogs = await listDogs();

	return (
		<div
			style={{
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				padding: '2rem',
				gap: '2rem',
			}}
		>
			{/* Form Section */}
			<div
				style={{
					backgroundColor: 'white',
					padding: '2rem',
					borderRadius: '8px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					border: '1px solid #e5e7eb',
				}}
			>
				<h2
					style={{
						margin: '0 0 1.5rem 0',
						fontSize: '1.5rem',
						fontWeight: '600',
						color: '#1e293b',
					}}
				>
					Add New Dog
				</h2>
				<form
					action={createDog}
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
						gap: '1rem',
						alignItems: 'end',
					}}
				>
					<div>
						<label
							style={{
								display: 'block',
								marginBottom: '0.5rem',
								fontSize: '0.875rem',
								fontWeight: '500',
								color: '#374151',
							}}
						>
							Name
						</label>
						<input
							type="text"
							name="name"
							pattern={wordsInputPattern('name')}
							maxLength={RAW_LENGTH_LIMIT}
							title="Words made of letters, with no links"
							style={{
								width: '100%',
								padding: '0.75rem',
								border: '1px solid #d1d5db',
								borderRadius: '4px',
								fontSize: '1rem',
								boxSizing: 'border-box',
							}}
							placeholder="Buddy"
							required
						/>
					</div>
					<div>
						<label
							style={{
								display: 'block',
								marginBottom: '0.5rem',
								fontSize: '0.875rem',
								fontWeight: '500',
								color: '#374151',
							}}
						>
							Breed
						</label>
						<input
							type="text"
							name="breed"
							pattern={wordsInputPattern('breed')}
							maxLength={RAW_LENGTH_LIMIT}
							title="Words made of letters, with no links"
							style={{
								width: '100%',
								padding: '0.75rem',
								border: '1px solid #d1d5db',
								borderRadius: '4px',
								fontSize: '1rem',
								boxSizing: 'border-box',
							}}
							placeholder="Dalmatian"
							required
						/>
					</div>
					<div>
						<label
							style={{
								display: 'block',
								marginBottom: '0.5rem',
								fontSize: '0.875rem',
								fontWeight: '500',
								color: '#374151',
							}}
						>
							Age (in years, 0–99)
						</label>
						<input
							type="text"
							inputMode="numeric"
							pattern={AGE_INPUT_PATTERN}
							maxLength={RAW_LENGTH_LIMIT}
							title="A whole number of years, 0 to 99"
							name="age"
							style={{
								width: '100%',
								padding: '0.75rem',
								border: '1px solid #d1d5db',
								borderRadius: '4px',
								fontSize: '1rem',
								boxSizing: 'border-box',
							}}
							placeholder="3"
							required
						/>
					</div>
					<div>
						<label
							style={{
								display: 'block',
								marginBottom: '0.5rem',
								fontSize: '0.875rem',
								fontWeight: '500',
								color: '#374151',
							}}
						>
							Color
						</label>
						<input
							type="text"
							name="color"
							pattern={wordsInputPattern('color')}
							maxLength={RAW_LENGTH_LIMIT}
							title="Words made of letters, with no links"
							style={{
								width: '100%',
								padding: '0.75rem',
								border: '1px solid #d1d5db',
								borderRadius: '4px',
								fontSize: '1rem',
								boxSizing: 'border-box',
							}}
							placeholder="Black and White"
							required
						/>
					</div>
					<button
						type="submit"
						style={{
							backgroundColor: '#403b8a',
							color: 'white',
							padding: '0.75rem 1.5rem',
							border: 'none',
							borderRadius: '4px',
							fontSize: '1rem',
							fontWeight: '500',
							cursor: 'pointer',
							transition: 'background-color 0.2s',
						}}
					>
						Add Dog
					</button>
				</form>
			</div>

			{/* Dogs List Section */}
			<div
				style={{
					backgroundColor: 'white',
					borderRadius: '8px',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
					border: '1px solid #e5e7eb',
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					minHeight: 0,
				}}
			>
				<div
					style={{
						padding: '1.5rem 2rem 0 2rem',
						borderBottom: '1px solid #e5e7eb',
					}}
				>
					<h2
						style={{
							margin: '0 0 1.5rem 0',
							fontSize: '1.5rem',
							fontWeight: '600',
							color: '#1e293b',
						}}
					>
						Dogs ({dogs.length})
					</h2>
				</div>
				<div
					style={{
						flex: 1,
						overflowY: 'auto',
						padding: '0 2rem 2rem 2rem',
					}}
				>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
							gap: '1rem',
							padding: '1rem 0',
							borderBottom: '2px solid #e5e7eb',
							fontWeight: '600',
							color: '#374151',
							fontSize: '0.875rem',
							textTransform: 'uppercase',
							letterSpacing: '0.05em',
						}}
					>
						<div>Name</div>
						<div>Breed</div>
						<div>Age</div>
						<div>Color</div>
						<div>Actions</div>
					</div>
					{dogs.map((dog) => (
						<div
							key={dog.id}
							style={{
								display: 'grid',
								gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr',
								gap: '1rem',
								padding: '1rem 0',
								borderBottom: '1px solid #f3f4f6',
								alignItems: 'center',
							}}
						>
							<div style={{ fontWeight: '500', color: '#1e293b' }}>{dog.name}</div>
							<div style={{ color: '#64748b' }}>{dog.breed}</div>
							<div style={{ color: '#64748b' }}>{dog.age} years</div>
							<div style={{ color: '#64748b' }}>{dog.color}</div>
							<div>
								<DeleteButton dogId={dog.id} />
							</div>
						</div>
					))}
					{dogs.length === 0 && (
						<div
							style={{
								padding: '2rem',
								textAlign: 'center',
								color: '#64748b',
							}}
						>
							No dogs found. Add one above!
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
